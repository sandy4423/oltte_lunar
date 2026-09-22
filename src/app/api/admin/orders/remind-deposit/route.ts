/**
 * 입금 독려 메시지 발송 API
 * 
 * 입금 대기 중인 고객에게 입금 안내 메시지를 재발송합니다.
 * 
 * 데이터 정합성:
 * - total_amount: 픽업 할인(3,000원) 반영된 최종 금액
 * - vbank_bank / vbank_num / vbank_expires_at: 실제 DB 컬럼명
 * - order_items: 주문 상품 내역 (SMS에 포함)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth.server';
import { sendSMS, createDepositReminderSMS, type OrderItemForSMS } from '@/lib/sms';
import { sendSlackMessage } from '@/lib/slack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getApartmentFullName, getProductBySku, APARTMENTS, PICKUP_APT_CODE } from '@/lib/constants';
import { ORDER_ITEMS_SELECT, getOrderItemEmoji, getOrderItemName } from '@/lib/orderItemName';

export const dynamic = 'force-dynamic';

interface RemindDepositRequest {
  orderIds: string[]; // 선택된 주문 ID 목록
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const authError = await verifyAdminAuth(request);
    if (authError) return authError;

    // 요청 바디 파싱
    const body: RemindDepositRequest = await request.json();
    const { orderIds } = body;

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '선택된 주문이 없습니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 선택된 주문 조회 (입금 대기 상태만, order_items 포함)
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select(`*, customer:customers(*), ${ORDER_ITEMS_SELECT}`)
      .in('id', orderIds)
      .eq('status', 'WAITING_FOR_DEPOSIT');

    if (fetchError) {
      console.error('[RemindDeposit] Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: '주문 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: '입금 대기 상태의 주문이 없습니다.' },
        { status: 400 }
      );
    }

    // 각 주문에 대해 SMS 발송
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const order of orders as any[]) {
      try {
        // 가상계좌 정보가 없으면 스킵 (실제 DB 컬럼명: vbank_bank, vbank_num)
        if (!order.vbank_bank || !order.vbank_num) {
          console.warn(`[RemindDeposit] Order ${order.id} has no virtual account info`);
          results.push({
            orderId: order.id,
            customerName: order.customer.name,
            success: false,
            error: '가상계좌 정보 없음',
          });
          failedCount++;
          continue;
        }

        // 단지 정보
        const apartment = APARTMENTS[order.apt_code];
        const aptName = apartment ? getApartmentFullName(apartment) : order.apt_name;
        
        // 입금 기한 포맷 (실제 DB 컬럼명: vbank_expires_at)
        const dueDate = order.vbank_expires_at
          ? format(new Date(order.vbank_expires_at), 'M월 d일 HH시', { locale: ko })
          : '배송일 전일';

        // 배송일 포맷
        const deliveryDate = format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko });
        
        // 픽업일 포맷 (픽업 주문인 경우)
        const pickupDate = order.pickup_date 
          ? format(new Date(order.pickup_date), 'M월 d일 (EEE)', { locale: ko })
          : null;

        // 주문 내역 변환 (order_items → SMS용 포맷)
        // 상품 이름은 공통 함수로 구한다. 캠페인 상품(떡국만두)은 sku 가 비어
        // 있어서 예전에는 문자에 상품명이 빈칸으로 나갔다.
        const orderItems: OrderItemForSMS[] = (order.order_items || []).map((item: any) => ({
          sku: item.sku,
          qty: item.qty,
          productName: getOrderItemName(item),
          emoji: getOrderItemEmoji(item, '📦'),
        }));

        // SMS 메시지 생성
        const isPickup = order.is_pickup || order.apt_code === PICKUP_APT_CODE;
        const smsText = createDepositReminderSMS({
          customerName: order.customer.name,
          bankName: order.vbank_bank,
          accountNumber: order.vbank_num,
          amount: order.total_amount,
          dueDate,
          deliveryDate,
          aptName,
          dong: order.dong || '',
          ho: order.ho || '',
          isPickup,
          pickupDate: pickupDate || undefined,
          pickupTime: order.pickup_time || undefined,
          orderItems,
        });

        // SMS 발송
        const smsResult = await sendSMS(order.customer.phone, smsText);

        if (smsResult.success) {
          successCount++;
          results.push({
            orderId: order.id,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            success: true,
          });
        } else {
          failedCount++;
          results.push({
            orderId: order.id,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            success: false,
            error: smsResult.error,
          });
        }

        // API Rate Limit 고려하여 약간의 딜레이 추가
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`[RemindDeposit] Error for order ${order.id}:`, error);
        failedCount++;
        results.push({
          orderId: order.id,
          customerName: order.customer.name,
          success: false,
          error: error.message || '알 수 없는 오류',
        });
      }
    }

    // Slack 알림 (관리자 발송 기록 추적)
    try {
      const customerNames = results
        .filter(r => r.success)
        .map(r => r.customerName)
        .join(', ');
      
      const slackMessage = `📨 입금 독려 메시지 발송

발송 대상: ${orders.length}명
성공: ${successCount}명
실패: ${failedCount}명
${customerNames ? `\n대상 고객: ${customerNames}` : ''}
발송 시각: ${format(new Date(), 'M월 d일 HH:mm', { locale: ko })}`;

      await sendSlackMessage(slackMessage);
    } catch (slackError) {
      // Slack 실패는 로그만 남기고 계속 진행
      console.error('[RemindDeposit] Slack error:', slackError);
    }

    // 결과 반환
    return NextResponse.json({
      success: true,
      message: `${successCount}명에게 입금 독려 메시지를 발송했습니다.`,
      summary: {
        total: orders.length,
        success: successCount,
        failed: failedCount,
      },
      results,
    });

  } catch (error: any) {
    console.error('[RemindDeposit] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
