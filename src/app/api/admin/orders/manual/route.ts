import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { APARTMENTS, PRODUCTS, PICKUP_DISCOUNT } from '@/lib/constants';
import { sendSlackAlert } from '@/lib/slack';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 관리자 수기 주문 생성 API
 * 
 * POST /api/admin/orders/manual
 * 
 * Body:
 * - customerName: 고객 이름
 * - customerPhone: 전화번호 (숫자만, 11자리)
 * - aptCode: 단지 코드
 * - dong: 동
 * - ho: 호
 * - isPickup: 픽업 여부
 * - cart: 상품 배열 [{ sku, qty }]
 * - paymentMethod: 'vbank' | 'pos_card' | 'pos_cash' | 'pos_transfer'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      aptCode,
      dong,
      ho,
      isPickup,
      cart,
      paymentMethod,
    } = body;

    // 입력 검증
    if (!customerName || !customerPhone || !aptCode || !dong || !ho || !cart || !paymentMethod) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 전화번호 검증
    const phoneRegex = /^01[0-9]{8,9}$/;
    if (!phoneRegex.test(customerPhone)) {
      return NextResponse.json(
        { error: '올바른 휴대폰 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 단지 유효성 확인
    const apartment = APARTMENTS[aptCode];
    if (!apartment) {
      return NextResponse.json(
        { error: '유효하지 않은 단지입니다.' },
        { status: 400 }
      );
    }

    // 주문 수량 계산
    const totalQty = cart.reduce((sum: number, item: any) => sum + item.qty, 0);
    if (totalQty < 3) {
      return NextResponse.json(
        { error: '최소 주문 수량은 3개입니다.' },
        { status: 400 }
      );
    }

    // 금액 계산
    let totalAmount = 0;
    for (const item of cart) {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      if (!product) {
        return NextResponse.json(
          { error: `유효하지 않은 상품: ${item.sku}` },
          { status: 400 }
        );
      }
      totalAmount += product.price * item.qty;
    }

    // 픽업 할인 적용
    const pickupDiscount = isPickup ? PICKUP_DISCOUNT : 0;
    totalAmount = Math.max(0, totalAmount - pickupDiscount);

    // 고객 정보 조회 또는 생성
    let customerId: string;

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // 고객 이름 업데이트 (다를 수 있음)
      await supabase
        .from('customers')
        .update({ name: customerName })
        .eq('id', customerId);
    } else {
      // 새 고객 생성
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          phone: customerPhone,
          name: customerName,
          marketing_opt_in: false,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        console.error('[ManualOrder] Customer creation error:', customerError);
        return NextResponse.json(
          { error: '고객 정보 생성에 실패했습니다.' },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // 주문 상태 결정
    // 수기 주문은 모두 포스기 결제이므로 결제 완료 상태
    const orderStatus = 'PAID';
    const paidAt = new Date().toISOString();

    // 마감일 계산 (배송일 D-1 23:00)
    const cutoffAt = apartment.cutoffAt;

    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        apt_code: aptCode,
        apt_name: apartment.name,
        dong,
        ho,
        delivery_date: apartment.deliveryDate,
        cutoff_at: cutoffAt,
        status: orderStatus,
        total_qty: totalQty,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        paid_at: paidAt,
        is_pickup: isPickup,
        pickup_discount: pickupDiscount,
        source: 'manual', // 수기 주문 표시
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[ManualOrder] Order creation error:', orderError);
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 주문 아이템 생성
    const orderItems = cart.map((item: any) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku)!;
      return {
        order_id: order.id,
        sku: item.sku,
        qty: item.qty,
        unit_price: product.price,
        line_amount: product.price * item.qty,
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[ManualOrder] Order items creation error:', itemsError);
      // 주문은 생성되었으므로 에러 알림만
      await sendSlackAlert({
        title: '⚠️ 수기 주문 아이템 생성 실패',
        fields: [
          { title: '주문 ID', value: order.id },
          { title: '고객명', value: customerName },
          { title: '오류', value: itemsError.message },
        ],
      }).catch(console.error);
    }

    // Slack 알림
    try {
      const paymentMethodLabel = 
        paymentMethod === 'pos_card' ? '포스기(카드)' :
        paymentMethod === 'pos_cash' ? '포스기(현금)' :
        '포스기(계좌이체)';

      await sendSlackAlert({
        title: '📝 수기 주문 접수 (포스기)',
        fields: [
          { title: '주문 ID', value: order.id },
          { title: '고객명', value: customerName },
          { title: '전화번호', value: customerPhone },
          { title: '단지', value: apartment.name },
          { title: '동호수', value: `${dong}동 ${ho}호` },
          { title: '배송방법', value: isPickup ? '픽업' : '배송' },
          { title: '결제방법', value: paymentMethodLabel },
          { title: '상태', value: '결제완료' },
          { title: '금액', value: `${totalAmount.toLocaleString()}원` },
        ],
      });
    } catch (slackError) {
      console.error('[ManualOrder] Slack notification error:', slackError);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });

  } catch (error: any) {
    console.error('[ManualOrder] Error:', error);
    return NextResponse.json(
      { error: error.message || '주문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
