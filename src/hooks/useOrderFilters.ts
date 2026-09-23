/**
 * 주문 필터링 훅
 * 
 * 단지, 배송일, 상태, 검색어로 주문을 필터링합니다.
 */

import { useState, useMemo } from 'react';
import type { OrderFull } from '@/types/database';
import { PICKUP_APT_CODE } from '@/lib/constants';

/** 검색어 비교 - 값이 없거나 문자열이 아니면 조용히 '해당 없음' 처리 */
function includesQuery(value: unknown, query: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(query);
}

/** 주문의 수령날짜(픽업은 pickup_date, 배달은 delivery_date) */
function getReceiveDate(order: Pick<OrderFull, 'is_pickup' | 'pickup_date' | 'delivery_date'>): string {
  return order.is_pickup && order.pickup_date ? order.pickup_date : (order.delivery_date ?? '');
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getTodayKST(): string {
  const now = new Date();
  // 로컬 타임존 사용 — 관리자 PC가 항상 KST라는 가정
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 시각(timestamptz)을 화면과 같은 기준(로컬=KST)의 날짜 문자열로 */
function toLocalDate(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useOrderFilters(orders: OrderFull[]) {
  const [filterApt, setFilterApt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('PAID');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState<string>('today');
  const [filterDeliveryMethod, setFilterDeliveryMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('delivery_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // 필터링 및 정렬된 주문
  const filteredOrders = useMemo(() => {
    const today = getTodayKST();

    const filtered = orders.filter((order) => {
      // 숨긴 주문 토글: showHidden이 false면 숨긴 주문 제외
      if (!showHidden && order.is_hidden) return false;
      // showHidden이 true면 숨긴 주문만 표시
      if (showHidden && !order.is_hidden) return false;

      /*
        상태 필터.
        캠페인 주문(떡국만두 등)은 손님이 가져가도 status 가 「결제완료」 그대로라
        상태만으로는 수령 여부를 못 가립니다. 그래서 수령 여부로 거르는
        두 항목(PICKED_UP · NOT_PICKED_UP)을 상태 목록에 함께 둡니다 (2026-09-22).
      */
      if (filterStatus === 'PICKED_UP') {
        if (!order.picked_up_at) return false;
      } else if (filterStatus === 'NOT_PICKED_UP') {
        if (order.picked_up_at) return false;
        if (!['PAID', 'LATE_DEPOSIT'].includes(order.status)) return false;
      } else if (filterStatus !== 'all' && order.status !== filterStatus) {
        return false;
      }
      if (filterApt !== 'all') {
        if (filterApt === PICKUP_APT_CODE) {
          // 픽업주문 필터: is_pickup 기준으로 판별
          if (!order.is_pickup) return false;
        } else {
          if (order.apt_code !== filterApt) return false;
        }
      }

      // 수령날짜 필터 — 픽업은 pickup_date, 배달은 delivery_date로 비교
      if (filterDeliveryDate !== 'all') {
        const receiveDate = getReceiveDate(order);
        const target = filterDeliveryDate === 'today' ? today : filterDeliveryDate;
        if (receiveDate !== target) {
          /*
            「오늘」을 볼 때는 *아직 안 찾아간 지난 픽업 주문*도 함께 보여줍니다 (2026-09-23).

            떡국만두처럼 이틀에 걸쳐 찾아가는 캠페인은 주문의 수령일이 첫날(9/22)로만 찍힙니다.
            그래서 둘째 날 손님이 매장에 와도 화면에 아무것도 없어 응대를 못 했습니다.
            돈을 받고 아직 안 드린 물건은 날짜가 지나도 보여야 합니다.

            ⛔ 픽업 주문만 대상입니다. 배달 주문은 picked_up_at 을 쓰지 않아 영영 미수령으로
               남으므로, 여기에 포함하면 과거 배달 주문이 전부 오늘 목록에 딸려 옵니다.
          */
          const waitingPickup =
            filterDeliveryDate === 'today' &&
            order.is_pickup &&
            !order.picked_up_at &&
            ['PAID', 'LATE_DEPOSIT'].includes(order.status) &&
            receiveDate !== '' &&
            receiveDate < today;

          /*
            오늘 손님에게 건넨 주문도 「오늘」 목록에 남깁니다 (2026-09-23).
            이것이 없으면 직원이 「전달완료」를 누르는 순간 그 주문이 화면에서 사라져
            (수령일이 어제라 날짜 필터에 걸린다) 방금 무엇을 처리했는지 확인할 수 없습니다.
          */
          const handedOverToday =
            filterDeliveryDate === 'today' && toLocalDate(order.picked_up_at) === today;

          if (!waitingPickup && !handedOverToday) return false;
        }
      }

      // 배달방법 필터
      if (filterDeliveryMethod === 'delivery' && order.is_pickup) return false;
      if (filterDeliveryMethod === 'pickup' && !order.is_pickup) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // 캠페인 주문(떡국만두 등)은 dong·ho·apt_name·apt_code 가 비어 있다.
        // 타입에는 NOT NULL 로 적혀 있지만 실제 DB 는 NULL 을 허용한다.
        // 이 블록은 useMemo(렌더 중)라서 여기서 예외가 나면 화면 전체가 하얗게 된다.
        // 그래서 어떤 필드가 없더라도 절대 터지지 않게 전부 걸러서 비교한다.
        const hit =
          includesQuery(order.customer?.name, query) ||
          includesQuery(order.customer?.phone, query) ||
          includesQuery(order.dong, query) ||
          includesQuery(order.ho, query);
        if (!hit) return false;
      }
      return true;
    });

    // 정렬
    return filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'delivery_date':
          // 픽업 주문은 pickup_date 우선, 없으면 delivery_date
          const dateA = a.is_pickup && a.pickup_date ? a.pickup_date : a.delivery_date;
          const dateB = b.is_pickup && b.pickup_date ? b.pickup_date : b.delivery_date;
          compareValue = new Date(dateA).getTime() - new Date(dateB).getTime();
          break;
        case 'total_amount':
          compareValue = a.total_amount - b.total_amount;
          break;
        case 'status':
          compareValue = (a.status ?? '').localeCompare(b.status ?? '');
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [orders, filterApt, filterStatus, filterDeliveryDate, filterDeliveryMethod, searchQuery, showHidden, sortBy, sortOrder]);

  // 고유 수령날짜 목록 (픽업은 pickup_date, 배달은 delivery_date)
  const uniqueDeliveryDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach((o) => {
      const d = getReceiveDate(o);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort();
  }, [orders]);

  return {
    filterApt,
    setFilterApt,
    filterStatus,
    setFilterStatus,
    filterDeliveryDate,
    setFilterDeliveryDate,
    filterDeliveryMethod,
    setFilterDeliveryMethod,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    showHidden,
    setShowHidden,
    filteredOrders,
    uniqueDeliveryDates,
  };
}
