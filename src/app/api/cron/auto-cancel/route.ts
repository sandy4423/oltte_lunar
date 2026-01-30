/**
 * 마감 자동 취소 Cron Job
 * 
 * 트리거: Vercel Cron (10분 단위) 또는 외부 스케줄러
 * 
 * PRD 6.2.3 마감 자동화 (Cron):
 * - 10분 단위 실행
 * - cutoff_at 경과 && WAITING_FOR_DEPOSIT 상태인 주문 → AUTO_CANCELED 처리
 * - 동시에 가상계좌 말소 API 호출하여 입금 차단
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { cancelPayment } from '@/lib/tosspayments';

// Vercel Cron 인증 (선택사항)
const CRON_SECRET = process.env.CRON_SECRET;

// ============================================
// GET /api/cron/auto-cancel
// ============================================

export async function GET(request: NextRequest) {
  console.log('[Cron] Auto-cancel job started at:', new Date().toISOString());

  try {
    // 1. 크론 인증 (프로덕션에서는 활성화 권장)
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        console.error('[Cron] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    // 2. 마감 지난 미입금 주문 조회
    // status = 'WAITING_FOR_DEPOSIT' AND cutoff_at < now
    const { data: expiredOrders, error: queryError } = await supabase
      .from('orders')
      .select('id, toss_payment_key, customer_id, apt_name')
      .eq('status', 'WAITING_FOR_DEPOSIT')
      .lt('cutoff_at', now);

    if (queryError) {
      console.error('[Cron] Failed to query expired orders:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', detail: queryError.message },
        { status: 500 }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('[Cron] No expired orders found');
      return NextResponse.json({
        processed: 0,
        message: 'No expired orders',
        timestamp: now,
      });
    }

    console.log(`[Cron] Found ${expiredOrders.length} expired orders to cancel`);

    // 3. 각 주문 처리
    const results: {
      orderId: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const order of expiredOrders) {
      try {
        // 3-1. 토스페이먼츠 결제 취소 (가상계좌 입금 차단)
        if (order.toss_payment_key) {
          try {
            await cancelPayment(
              order.toss_payment_key,
              '입금 마감 시간 경과로 자동 취소'
            );
            console.log(`[Cron] Payment cancelled for order ${order.id}`);
          } catch (cancelError) {
            // 결제 취소 실패는 로그만 남기고 계속 진행
            // (이미 취소된 경우 등)
            console.error(`[Cron] Payment cancel failed for order ${order.id}:`, cancelError);
          }
        }

        // 3-2. DB 상태 변경: AUTO_CANCELED
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'AUTO_CANCELED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          // 멱등성: 아직 WAITING_FOR_DEPOSIT인 경우에만 업데이트
          .eq('status', 'WAITING_FOR_DEPOSIT');

        if (updateError) {
          console.error(`[Cron] Failed to update order ${order.id}:`, updateError);
          results.push({
            orderId: order.id,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        console.log(`[Cron] Order ${order.id} cancelled (${order.apt_name})`);
        results.push({
          orderId: order.id,
          success: true,
        });
      } catch (error) {
        console.error(`[Cron] Error processing order ${order.id}:`, error);
        results.push({
          orderId: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 4. 결과 집계
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`[Cron] Auto-cancel completed: ${successCount} success, ${failedCount} failed`);

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      failed: failedCount,
      results,
      timestamp: now,
    });
  } catch (error) {
    console.error('[Cron] Auto-cancel job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// Vercel Cron 설정
// vercel.json에 아래 설정 추가 필요:
// {
//   "crons": [{
//     "path": "/api/cron/auto-cancel",
//     "schedule": "*/10 * * * *"
//   }]
// }
// ============================================
