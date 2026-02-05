import { useState, useMemo, useEffect } from 'react';
import type { ApartmentConfig } from '@/lib/constants';

/**
 * 주문 페이지 팝업 타입
 */
export type PopupType = 'welcome' | 'zeroDayWarning' | 'extendedOrder' | 'pickupOnly' | null;

/**
 * useOrderPopups 반환 타입
 */
export interface UseOrderPopupsReturn {
  activePopup: PopupType;
  closePopup: () => void;
  isExpired: boolean;
  isDeliveryDatePassed: boolean;
  isCutoffToday: boolean;
}

/**
 * 주문 페이지 팝업 관리 훅
 * 
 * 마감일, 배송일에 따라 적절한 팝업을 표시합니다.
 * 
 * 우선순위:
 * 1. 배송일 지남 → 픽업 전용 팝업
 * 2. 마감일 지남 (배송일 전) → 추가 주문 팝업
 * 3. 마감 당일 → 마감 임박 팝업
 * 4. 마감 전 → 환영 팝업
 * 
 * @param apartment - 아파트 정보
 * @returns 활성 팝업 타입 및 제어 함수
 */
export function useOrderPopups(apartment: ApartmentConfig | null): UseOrderPopupsReturn {
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  // 마감 체크
  const isExpired = useMemo(() => {
    if (!apartment) return false;
    return new Date() > new Date(apartment.cutoffAt);
  }, [apartment]);

  // 배송일이 지났는지 체크
  const isDeliveryDatePassed = useMemo(() => {
    if (!apartment) return false;
    const today = new Date();
    const deliveryDate = new Date(apartment.deliveryDate);
    // 시간 무시하고 날짜만 비교
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    return today >= deliveryDate;
  }, [apartment]);

  // 마감일이 오늘인지 체크 (날짜만 비교, 시간 제외)
  const isCutoffToday = useMemo(() => {
    if (!apartment) return false;
    const now = new Date();
    const cutoff = new Date(apartment.cutoffAt);
    return now.toDateString() === cutoff.toDateString();
  }, [apartment]);

  // 페이지 로드 시 팝업 결정
  useEffect(() => {
    if (!apartment) {
      setActivePopup(null);
      return;
    }

    // 배송일이 지났으면 픽업만 가능 팝업
    if (isDeliveryDatePassed) {
      setActivePopup('pickupOnly');
    }
    // 마감일이 지났지만 배송일 전이면 추가 주문 안내 팝업
    else if (isExpired) {
      setActivePopup('extendedOrder');
    }
    // 마감 당일 팝업 (날짜 기준)
    else if (isCutoffToday) {
      setActivePopup('zeroDayWarning');
    }
    // 마감 전이면 환영 팝업
    else {
      setActivePopup('welcome');
    }
  }, [apartment, isExpired, isDeliveryDatePassed, isCutoffToday]);

  // 팝업 닫기
  const closePopup = () => {
    setActivePopup(null);
  };

  return {
    activePopup,
    closePopup,
    isExpired,
    isDeliveryDatePassed,
    isCutoffToday,
  };
}
