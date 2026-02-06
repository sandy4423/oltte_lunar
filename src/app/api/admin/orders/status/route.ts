/**
 * 관리자 주문 상태 변경 API
 * 
 * 서버에서 SERVICE ROLE KEY를 사용하여 선택된 주문들의 상태를 일괄 변경합니다.
 * RLS를 우회하여 관리자 권한으로 접근합니다.
 * DELIVERED 상태 변경 시 고객에게 전달완료 SMS를 발송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { sendSMS, createDeliveredSMS } from '@/lib/sms';
import type { OrderStatus } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const authError = verifyAdminAuth(request);
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

    // DELIVERED 상태로 변경 시 SMS 발송을 위해 주문 정보 조회
    if (status === 'DELIVERED') {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, is_pickup, customer:customers(name, phone)')
        .in('id', orderIds);

      if (ordersData) {
        // SMS 발송 (비동기, 실패해도 상태 변경은 진행)
        for (const order of ordersData) {
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
      }
    }

    // 주문 상태 업데이트
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
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
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
