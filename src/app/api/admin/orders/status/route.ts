/**
 * 관리자 주문 상태 변경 API
 *
 * 서버에서 SERVICE ROLE KEY를 사용하여 선택된 주문들의 상태를 일괄 변경합니다.
 * RLS를 우회하여 관리자 권한으로 접근합니다.
 * DELIVERED 상태 변경 시 고객에게 전달완료 SMS를 발송합니다.
 *
 * ── 캠페인 주문(떡국만두 등)은 다르게 처리합니다 (2026-09-22) ─────────────
 * 이 앱과 장부앱이 같은 DB 를 쓰고, 떡국만두 주문은 두 화면에 다 보입니다.
 * 장부앱 카운터의 「수령 완료」는 `orders.picked_up_at` 에 시각을 찍고
 * `status` 는 PAID 그대로 둡니다.
 *
 * ⛔ 캠페인 주문을 `DELIVERED` 로 바꾸면 안 됩니다. 장부앱의 「입금완료」 집합은
 *    `['PAID','LATE_DEPOSIT']` 뿐이라, DELIVERED 가 된 주문을 **입금대기로 봅니다**
 *    (수령 버튼도 409 로 막힙니다). `DELIVERED` 는 「입금됨」을 뜻하지 않습니다.
 *
 * 그래서 `campaign_id` 가 있는 주문은 `picked_up_at` 만 찍고 `status` 는 그대로 둡니다.
 * 막는 조건(택배·미입금·이미 수령)도 장부앱 `api/fresh/admin/pickup` 과 같게 맞췄습니다.
 * 캠페인 아닌 주문(전골)은 예전과 완전히 같습니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth.server';
import { sendSMS, createDeliveredSMS } from '@/lib/sms';
import {
  campaignLinesFromOrderItems,
  createCampaignPickupDoneSMS,
} from '@/lib/campaignPickupSms';
import type { OrderStatus, OrderUpdate } from '@/types/database';

/*
  ⚠️ `.update(...)` 에 `as never` 를 붙이는 이유
  이 레포의 `Database` 제네릭이 supabase-js v2 가 기대하는 모양이 아니라서
  `.from('orders').update({...})` 의 인자 타입이 `never` 로 풀립니다
  (레포 전체에 같은 오류가 266건 있습니다 — 이 파일만의 문제가 아닙니다).
  대신 payload 를 `OrderUpdate` 로 먼저 만들어 **칸 이름·타입은 그대로 검사**받고,
  클라이언트에 넘길 때만 캐스팅합니다.
*/

/** 장부앱과 같은 「입금완료」 집합. 이 상태가 아니면 수령 처리하지 않습니다 */
const PAID_STATUSES = ['PAID', 'LATE_DEPOSIT'];

/** 건너뛴 주문 한 건 */
interface SkippedOrder {
  orderId: string;
  name: string;
  /** already=이미 수령 / unpaid=미입금 / shipping=택배 / cancelled=그 사이 취소 / error=처리 실패 */
  reason: 'already' | 'unpaid' | 'shipping' | 'cancelled' | 'error';
  message: string;
}

/** 사장님이 읽는 시각 문구 (한국시간). 못 읽으면 원본을 그대로 돌려줍니다 */
function formatKST(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Supabase 조인 결과는 객체일 수도 배열일 수도 있습니다 */
function one<T = any>(v: any): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { orderIds, status } = body as { orderIds: string[]; status: OrderStatus };

    // 파라미터 검증
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: '변경할 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // ────────────────────────────────────────────────────────────────
    // DELIVERED 가 아닌 상태 변경은 예전 그대로입니다 (배송출발 등)
    // ────────────────────────────────────────────────────────────────
    if (status !== 'DELIVERED') {
      const patch: OrderUpdate = { status, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('orders')
        .update(patch as never)
        .in('id', orderIds);

      if (error) {
        console.error('[Admin API] Update status error:', error);
        return NextResponse.json(
          { error: '주문 상태 변경에 실패했습니다.' },
          { status: 500 }
        );
      }

      console.log(`[Admin API] Status changed to ${status} for ${orderIds.length} orders`);

      return NextResponse.json({
        success: true,
        updatedCount: orderIds.length,
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 여기부터 DELIVERED(전달완료). 캠페인 주문과 전골 주문을 갈라냅니다
    // ────────────────────────────────────────────────────────────────
    const { data: ordersData, error: fetchError } = await supabase
      .from('orders')
      .select(
        'id, is_pickup, status, campaign_id, picked_up_at, total_qty, ' +
          'customer:customers(name, phone), ' +
          // is_addon — 곁들임이면 문자의 단위가 「팩」이 아니라 「장」입니다
          'order_items(qty, campaign_product:campaign_products(name, is_addon))'
      )
      .in('id', orderIds);

    /*
      ⛔ 주문을 못 읽으면 아무것도 바꾸지 않습니다.
         campaign_id 를 모르는 채로 UPDATE 하면 캠페인 주문까지 DELIVERED 가 되어
         장부앱이 그 주문을 입금대기로 봅니다. 다시 누르면 됩니다.
         (예전에는 못 읽어도 문자만 건너뛰고 UPDATE 를 진행했습니다)
    */
    if (fetchError || !ordersData) {
      console.error('[Admin API] Fetch orders for delivery error:', fetchError);
      return NextResponse.json(
        { error: '주문 정보를 확인하지 못했습니다. 다시 눌러주세요.' },
        { status: 500 }
      );
    }

    const campaignOrders = (ordersData as any[]).filter((o) => o.campaign_id);
    const plainOrders = (ordersData as any[]).filter((o) => !o.campaign_id);

    const skipped: SkippedOrder[] = [];
    const smsSkipped: { orderId: string; name: string }[] = [];
    let deliveredCount = 0;
    let pickedUpCount = 0;

    // ────────────────────────────────────────────────────────────────
    // 1) 전골 주문 — 예전과 완전히 같습니다 (문자 먼저, 그 다음 status 변경)
    // ────────────────────────────────────────────────────────────────
    if (plainOrders.length > 0) {
      // SMS 발송 (비동기, 실패해도 상태 변경은 진행)
      for (const order of plainOrders) {
        try {
          const smsText = createDeliveredSMS({
            customerName: (order.customer as any).name,
            isPickup: order.is_pickup || false,
          });
          const result = await sendSMS((order.customer as any).phone, smsText);
          if (!result.success) {
            console.error(`[Admin API] SMS 발송 실패 (${order.id}):`, result.error);
          }
        } catch (smsError) {
          console.error(`[Admin API] SMS 발송 오류 (${order.id}):`, smsError);
        }
      }

      const plainIds = plainOrders.map((o) => o.id);
      const patch: OrderUpdate = { status, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('orders')
        .update(patch as never)
        .in('id', plainIds);

      if (error) {
        console.error('[Admin API] Update status error:', error);
        return NextResponse.json(
          { error: '주문 상태 변경에 실패했습니다.' },
          { status: 500 }
        );
      }
      deliveredCount = plainIds.length;
      console.log(`[Admin API] Status changed to ${status} for ${deliveredCount} orders`);
    }

    // ────────────────────────────────────────────────────────────────
    // 2) 캠페인 주문 — status 는 그대로, picked_up_at 만 찍습니다
    // ────────────────────────────────────────────────────────────────
    if (campaignOrders.length > 0) {
      const campaignOrderIds = campaignOrders.map((o) => o.id);
      const campaignIds = Array.from(
        new Set(campaignOrders.map((o) => o.campaign_id as string))
      );

      // 택배 여부(ship_name)와 손님 이름(depositor_name)을 한 번에 읽습니다.
      // 장부앱과 같은 규칙: ship_name 이 있으면 택배 주문 → 수령 처리하지 않습니다.
      const [{ data: details, error: detailErr }, { data: camps }] = await Promise.all([
        supabase
          .from('campaign_order_details')
          .select('order_id, depositor_name, ship_name')
          .in('order_id', campaignOrderIds),
        supabase.from('sale_campaigns').select('id, slug').in('id', campaignIds),
      ]);

      const detailByOrder = new Map<string, any>();
      for (const d of (details as any[]) ?? []) detailByOrder.set(d.order_id, d);
      const slugById = new Map<string, string>();
      for (const c of (camps as any[]) ?? []) slugById.set(c.id, c.slug);

      for (const order of campaignOrders) {
        const detail = detailByOrder.get(order.id);
        const displayName =
          detail?.depositor_name || one<any>(order.customer)?.name || '(이름없음)';

        /*
          ⚠️ 택배 여부를 못 읽었으면 처리하지 않습니다. 모른 채 통과시키면
             아직 보내지도 않은 주문에 「수령 완료」 문자가 나갑니다.
             (장부앱 api/fresh/admin/pickup 과 같은 판정)
        */
        if (detailErr) {
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: 'error',
            message: '주문 정보를 확인하지 못했습니다. 다시 눌러주세요.',
          });
          continue;
        }

        if (detail?.ship_name) {
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: 'shipping',
            message: '택배 주문이라 수령 처리하지 않았습니다.',
          });
          continue;
        }

        if (!PAID_STATUSES.includes(String(order.status))) {
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: 'unpaid',
            message: '입금이 확인되지 않은 주문입니다.',
          });
          continue;
        }

        // 이미 수령한 건은 덮어쓰지 않습니다 — 문자가 두 번 나가지 않게 합니다
        if (order.picked_up_at) {
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: 'already',
            message: `이미 ${formatKST(order.picked_up_at)} 에 수령 처리된 주문입니다.`,
          });
          continue;
        }

        const now = new Date().toISOString();
        const pickupPatch: OrderUpdate = { picked_up_at: now, updated_at: now };
        const { data: updated, error: updateErr } = await supabase
          .from('orders')
          .update(pickupPatch as never)
          .eq('id', order.id)
          .is('picked_up_at', null) // 동시에 두 명이 눌러도 한 번만
          .in('status', PAID_STATUSES) // 그 사이 취소됐으면 0행
          .select('id');

        if (updateErr) {
          console.error('[Admin API] 수령 처리 실패:', order.id, updateErr.message);
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: 'error',
            message: '수령 처리에 실패했습니다.',
          });
          continue;
        }

        if (!updated || updated.length === 0) {
          // 0행 — 그 사이 다른 사람이 수령 처리했거나 주문이 취소됐습니다
          const { data: fresh } = await supabase
            .from('orders')
            .select('status, picked_up_at')
            .eq('id', order.id)
            .maybeSingle();
          const cancelled =
            fresh && !(fresh as any).picked_up_at &&
            !PAID_STATUSES.includes(String((fresh as any).status));
          skipped.push({
            orderId: order.id,
            name: displayName,
            reason: cancelled ? 'cancelled' : 'already',
            message: cancelled
              ? '방금 주문이 취소되어 수령 처리하지 않았습니다. 물건을 내주지 마세요.'
              : '이미 수령 처리된 주문입니다.',
          });
          continue;
        }

        pickedUpCount += 1;

        /*
          수령 완료 문자. 영수증 역할입니다 — 나중에 "안 받았다" 는 이야기가
          나왔을 때 서로 확인할 것이 생깁니다.
          ⛔ 발송이 실패해도 수령 처리는 되돌리지 않습니다. 물건은 이미 나갔습니다.
          ⛔ 문안은 장부앱 `createPickupDoneSMS` 의 사본입니다 (lib/campaignPickupSms.ts).
             모르는 캠페인이면 null 이 돌아오고, 문자 없이 수령 처리만 됩니다.
        */
        try {
          const phone = one<any>(order.customer)?.phone;
          const smsText = createCampaignPickupDoneSMS({
            slug: slugById.get(order.campaign_id) ?? null,
            depositorName: detail?.depositor_name,
            items: campaignLinesFromOrderItems(order.order_items),
            totalQty: order.total_qty,
          });

          if (!phone || !smsText) {
            smsSkipped.push({ orderId: order.id, name: displayName });
          } else {
            const result = await sendSMS(phone, smsText);
            if (!result.success) {
              console.error('[Admin API] 수령완료 문자 실패:', order.id, result.error);
            }
          }
        } catch (smsError) {
          console.error('[Admin API] 수령완료 문자 예외:', order.id, smsError);
        }
      }

      console.log(
        `[Admin API] 캠페인 수령 처리 ${pickedUpCount}건, 건너뜀 ${skipped.length}건`
      );
    }

    return NextResponse.json({
      success: true,
      // 예전 호환 — 전골만 고른 평소에는 예전과 같은 값입니다
      updatedCount: deliveredCount + pickedUpCount,
      delivered: deliveredCount,
      pickedUp: pickedUpCount,
      skipped,
      smsSkipped,
    });
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
