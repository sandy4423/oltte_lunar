/**
 * 관리자 통계 조회 API
 * 
 * 상품별/단지별/매출/배송일별 통계를 조회합니다.
 * 출하 수량 데이터도 함께 반환합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/adminAuth.server';
import type { OrderRow, OrderItemRow, ProductShipmentQuantityRow } from '@/types/database';
import { MANDU_STORE_ID } from '@/lib/stores';
import { ORDER_ITEMS_SELECT, getOrderItemEmoji, getOrderItemKey, getOrderItemName } from '@/lib/orderItemName';

// 캐싱 비활성화 - 항상 최신 데이터 조회
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 출하 날짜 범위 상수
const SHIPMENT_DATES = [
  '2026-02-11',
  '2026-02-12',
  '2026-02-13',
  '2026-02-14',
  '2026-02-15',
];

// 유효한 주문 상태 (취소/환불 제외)
const VALID_ORDER_STATUSES = [
  'WAITING_FOR_DEPOSIT',
  'PAID',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'LATE_DEPOSIT',
];

// 결제완료 상태
const PAID_STATUSES = [
  'PAID',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'LATE_DEPOSIT',
];

export async function GET(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth(request);
    if (authError) return authError;

    const supabase = createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // ============================================
    // 1. 주문 + 주문상품 데이터 조회
    // ============================================
    // 만두 매장(1호점) 주문만 — 같은 DB 의 빙수 매장 과일 캠페인 매출이
    // 만두 매출로 합산되면 안 된다. 떡국만두 캠페인은 만두 매장이라 포함된다.
    let query = supabase
      .from('orders')
      .select(`*, ${ORDER_ITEMS_SELECT}`)
      .eq('store_id', MANDU_STORE_ID)
      .eq('is_hidden', false);

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00+09:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59+09:00`);
    }

    const { data: rawOrders, error: ordersError } = await query;

    if (ordersError) {
      console.error('[Admin Stats API] Fetch orders error:', ordersError);
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: '주문 데이터 조회에 실패했습니다.',
        },
        { status: 500 }
      );
    }

    // 유효한 상태만 필터링 (TypeScript 호환성)
    const orders = (rawOrders || []).filter(
      (o: any) => VALID_ORDER_STATUSES.includes(o.status)
    ) as (OrderRow & { order_items: OrderItemRow[] })[];

    // ============================================
    // 2. 출하 수량 데이터 조회
    // ============================================
    const { data: rawShipmentData, error: shipmentError } = await supabase
      .from('product_shipment_quantities')
      .select('*');

    if (shipmentError) {
      console.error('[Admin Stats API] Fetch shipment data error:', shipmentError);
      // 출하 수량 조회 실패해도 통계는 반환
    }

    // 출하 날짜 범위 내만 필터링
    const shipmentData = (rawShipmentData || []).filter(
      (s: any) => SHIPMENT_DATES.includes(s.shipment_date)
    ) as ProductShipmentQuantityRow[];

    // ============================================
    // 3. 데이터 집계
    // ============================================
    const allOrders = orders;

    // 상품별 통계
    const products: Record<string, {
      name: string;
      emoji: string;
      totalQty: number;
      totalRevenue: number;
      byApt: Record<string, number>;
      shipmentByDate: Record<string, number>;
    }> = {};

    // 매출 통계
    const sales = {
      totalRevenue: 0,
      totalOrders: 0,
      totalDiscount: 0,
      netRevenue: 0,
      byApt: {} as Record<string, { revenue: number; orders: number; name: string }>,
      byProduct: {} as Record<string, { revenue: number; qty: number }>,
      byStatus: {
        paid: 0,
        waitingDeposit: 0,
        delivered: 0,
        refunded: 0,
      },
      byDeliveryMethod: {
        delivery: { revenue: 0, orders: 0 },
        pickup: { revenue: 0, orders: 0 },
      },
    };

    // 배송 캘린더 데이터
    const calendar: Record<string, {
      items: Record<string, number>;
      orderCount: {
        delivery: number;
        pickup: number;
      };
    }> = {};

    // 상품 정보 매핑
    const PRODUCT_INFO: Record<string, { name: string; emoji: string }> = {
      meat: { name: '고기만두', emoji: '🥟' },
      kimchi: { name: '김치만두', emoji: '🌶️' },
      half: { name: '반반만두', emoji: '🥟' },
      ricecake_1kg: { name: '떡국떡', emoji: '🍚' },
      broth_1200ml: { name: '양지육수', emoji: '🍲' },
    };

    // 출하 수량 초기화
    for (const sku of Object.keys(PRODUCT_INFO)) {
      products[sku] = {
        name: PRODUCT_INFO[sku].name,
        emoji: PRODUCT_INFO[sku].emoji,
        totalQty: 0,
        totalRevenue: 0,
        byApt: {},
        shipmentByDate: {},
      };
      for (const date of SHIPMENT_DATES) {
        products[sku].shipmentByDate[date] = 0;
      }
    }

    // 출하 수량 데이터 매핑
    for (const row of shipmentData) {
      if (products[row.sku]) {
        products[row.sku].shipmentByDate[row.shipment_date] = row.quantity;
      }
    }

    // 주문 데이터 집계
    for (const order of allOrders) {
      const isPaid = PAID_STATUSES.includes(order.status);
      const orderRevenue = isPaid ? order.total_amount : 0;
      
      // 픽업 할인 금액 (할인 전 금액 계산용)
      const discount = isPaid && order.is_pickup ? (order.pickup_discount || 3000) : 0;
      const revenueBeforeDiscount = orderRevenue + discount;

      // 전체 매출
      sales.totalOrders++;
      sales.totalRevenue += revenueBeforeDiscount;
      sales.totalDiscount += discount;
      sales.netRevenue += orderRevenue;

      // 상태별 매출
      if (order.status === 'WAITING_FOR_DEPOSIT') {
        sales.byStatus.waitingDeposit += order.total_amount;
      } else if (isPaid) {
        sales.byStatus.paid += orderRevenue;
        if (order.status === 'DELIVERED') {
          sales.byStatus.delivered += orderRevenue;
        }
      }

      // 단지별 매출
      const aptCode = order.apt_code;
      if (!sales.byApt[aptCode]) {
        sales.byApt[aptCode] = { revenue: 0, orders: 0, name: order.apt_name };
      }
      sales.byApt[aptCode].revenue += orderRevenue;
      sales.byApt[aptCode].orders++;

      // 배달/픽업별 매출
      if (order.is_pickup) {
        sales.byDeliveryMethod.pickup.revenue += orderRevenue;
        sales.byDeliveryMethod.pickup.orders++;
      } else {
        sales.byDeliveryMethod.delivery.revenue += orderRevenue;
        sales.byDeliveryMethod.delivery.orders++;
      }

      // 배송 캘린더
      const deliveryDate = order.is_pickup
        ? order.pickup_date || order.delivery_date
        : order.delivery_date;

      if (deliveryDate && isPaid) {
        if (!calendar[deliveryDate]) {
          calendar[deliveryDate] = {
            items: {},
            orderCount: { delivery: 0, pickup: 0 },
          };
        }

        // 주문 건수 집계
        if (order.is_pickup) {
          calendar[deliveryDate].orderCount.pickup++;
        } else {
          calendar[deliveryDate].orderCount.delivery++;
        }

        // 상품별 수량 집계
        // 캠페인 상품은 sku 가 비어 있어 sku 로 묶으면 서로 다른 상품이 한 덩어리가 된다.
        for (const item of (order.order_items || [])) {
          const key = getOrderItemKey(item);
          const currentQty = calendar[deliveryDate].items[key] || 0;
          calendar[deliveryDate].items[key] = currentQty + item.qty;
        }
      }

      // 상품별 집계 (결제완료 건만)
      if (isPaid) {
        for (const item of (order.order_items || [])) {
          const sku = getOrderItemKey(item);

          if (!products[sku]) {
            const info = (item.sku ? PRODUCT_INFO[item.sku] : undefined) || {
              name: getOrderItemName(item),
              emoji: getOrderItemEmoji(item, '📦'),
            };
            products[sku] = {
              name: info.name,
              emoji: info.emoji,
              totalQty: 0,
              totalRevenue: 0,
              byApt: {},
              shipmentByDate: {},
            };
            for (const date of SHIPMENT_DATES) {
              products[sku].shipmentByDate[date] = 0;
            }
          }

          products[sku].totalQty += item.qty;
          products[sku].totalRevenue += item.line_amount;

          // 단지별 상품 수량
          if (!products[sku].byApt[aptCode]) {
            products[sku].byApt[aptCode] = 0;
          }
          products[sku].byApt[aptCode] += item.qty;

          // 상품별 매출
          if (!sales.byProduct[sku]) {
            sales.byProduct[sku] = { revenue: 0, qty: 0 };
          }
          sales.byProduct[sku].revenue += item.line_amount;
          sales.byProduct[sku].qty += item.qty;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      products,
      sales,
      calendar,
      shipmentDates: SHIPMENT_DATES,
    });
  } catch (error: any) {
    console.error('[Admin Stats API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message || '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
