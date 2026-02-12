/**
 * 픽업시간 변경 API
 * PATCH /api/orders/pickup-time
 * 
 * 결제완료 또는 입금대기 상태의 픽업 주문의 픽업 날짜/시간을 변경합니다.
 * 제약: 픽업 예정 시간 3시간 전까지만 변경 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS, createPickupTimeChangeSMS } from '@/lib/sms';
import { sendSlackMessage, createPickupTimeChangeAlert } from '@/lib/slack';
import { getAvailableTimeSlots, getAvailablePickupDates } from '@/lib/constants';
import { formatKST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, phone, pickupDate, pickupTime } = body;

    // 필수 필드 확인
    if (!orderId || !phone || !pickupDate || !pickupTime) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 전화번호 정규화
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: '올바른 전화번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. 주문 조회 (고객 정보 포함)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          id,
          phone,
          name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[PickupTime API] Order not found:', orderId, orderError);
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 전화번호로 소유권 확인
    if (order.customer?.phone !== normalizedPhone) {
      console.error('[PickupTime API] Phone mismatch:', { 
        orderPhone: order.customer?.phone, 
        requestPhone: normalizedPhone 
      });
      return NextResponse.json(
        { success: false, error: '주문 정보가 일치하지 않습니다.' },
        { status: 403 }
      );
    }

    // 3. 픽업 주문 확인
    if (!order.is_pickup) {
      return NextResponse.json(
        { success: false, error: '픽업 주문만 변경할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 4. 주문 상태 확인 (PAID 또는 WAITING_FOR_DEPOSIT만)
    if (order.status !== 'PAID' && order.status !== 'WAITING_FOR_DEPOSIT') {
      return NextResponse.json(
        { 
          success: false, 
          error: '결제완료 또는 입금대기 상태의 주문만 변경할 수 있습니다.' 
        },
        { status: 400 }
      );
    }

    // 5. 새로운 픽업 날짜/시간 유효성 검증
    const availableDates = getAvailablePickupDates();
    if (!availableDates.includes(pickupDate)) {
      return NextResponse.json(
        { success: false, error: '선택한 날짜는 픽업이 불가능합니다.' },
        { status: 400 }
      );
    }

    const availableTimeSlots = getAvailableTimeSlots(pickupDate);
    if (!availableTimeSlots.includes(pickupTime)) {
      return NextResponse.json(
        { success: false, error: '선택한 시간은 픽업이 불가능합니다.' },
        { status: 400 }
      );
    }

    // 6. 기존 픽업 정보 저장 (알림용)
    const oldPickupDate = order.pickup_date;
    const oldPickupTime = order.pickup_time;
    const isFirstTimeSelection = !oldPickupDate || !oldPickupTime;

    // 7. 3시간 전 제약 확인 (기존 시간이 있는 경우에만 적용)
    if (!isFirstTimeSelection) {
      const newPickupDateTime = new Date(`${pickupDate}T${pickupTime}:00+09:00`);
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      const timeDiff = newPickupDateTime.getTime() - now.getTime();

      if (timeDiff <= threeHoursInMs) {
        const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        return NextResponse.json(
          { 
            success: false, 
            error: `픽업 3시간 전까지만 변경할 수 있습니다. (남은 시간: ${hoursLeft}시간 ${minutesLeft}분)` 
          },
          { status: 400 }
        );
      }
    }

    // 8. 주문 정보 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[PickupTime API] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: '픽업시간 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[PickupTime API] Order ${orderId} pickup time changed:`, {
      old: `${oldPickupDate} ${oldPickupTime}`,
      new: `${pickupDate} ${pickupTime}`,
    });

    // 9. SMS 발송 (고객)
    try {
      if (order.customer?.phone && order.customer?.name) {
        const newDateFormatted = formatKST(pickupDate, 'M월 d일 (EEE)');
        
        if (isFirstTimeSelection) {
          // 최초 시간 선택 - 간단한 확인 SMS
          await sendSMS(
            order.customer.phone,
            `[올때만두] ${order.customer.name}님 픽업 시간이 확정되었습니다!\n\n픽업일시: ${newDateFormatted} ${pickupTime}\n픽업장소: e편한세상송도 후문상가 안쪽. 컴포즈 옆 (랜드마크로 113)\n\n선택하신 시간에 맞춰 방문해주세요!`
          );
        } else {
          const oldDateFormatted = formatKST(oldPickupDate, 'M월 d일 (EEE)');
          await sendSMS(
            order.customer.phone,
            createPickupTimeChangeSMS({
              customerName: order.customer.name,
              oldPickupDate: oldDateFormatted,
              oldPickupTime: oldPickupTime || '-',
              newPickupDate: newDateFormatted,
              newPickupTime: pickupTime,
            })
          );
        }
        
        console.log(`[PickupTime API] SMS sent to ${order.customer.phone}`);
      }
    } catch (smsError) {
      // SMS 실패는 로그만 남기고 계속 진행
      console.error('[PickupTime API] SMS error:', smsError);
    }

    // 10. Slack 알림 (관리자)
    try {
      const newDateFormatted = formatKST(pickupDate, 'M월 d일 (EEE)');
      
      if (isFirstTimeSelection) {
        await sendSlackMessage(
          `:white_check_mark: *픽업시간 선택 완료*\n주문번호: ${orderId}\n고객: ${order.customer?.name || '고객'} (${order.customer?.phone || '미입력'})\n선택: ${newDateFormatted} ${pickupTime}`
        );
      } else {
        const oldDateFormatted = formatKST(oldPickupDate, 'M월 d일 (EEE)');
        await sendSlackMessage(
          createPickupTimeChangeAlert({
            orderId,
            customerName: order.customer?.name || '고객',
            customerPhone: order.customer?.phone || '미입력',
            oldPickupDate: oldDateFormatted,
            oldPickupTime: oldPickupTime || '-',
            newPickupDate: newDateFormatted,
            newPickupTime: pickupTime,
          })
        );
      }
      
      console.log(`[PickupTime API] Slack notification sent`);
    } catch (slackError) {
      // Slack 실패는 로그만 남기고 계속 진행
      console.error('[PickupTime API] Slack error:', slackError);
    }

    return NextResponse.json(
      { success: true, message: isFirstTimeSelection ? '픽업시간이 선택되었습니다.' : '픽업시간이 변경되었습니다.' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('[PickupTime API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
