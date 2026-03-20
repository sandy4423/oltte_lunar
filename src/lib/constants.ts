/**
 * 단지별 일정 및 상품 상수
 * PRD 섹션 3, 4 기반
 */

// ============================================
// 단지별 일정 (PRD 4. 단지별 일정)
// ============================================

export interface ApartmentConfig {
  code: string;        // URL 파라미터
  name: string;        // 표시용 이름
  dongRange?: string;  // 동 범위 (예: "101동–106동")
  households: number;  // 세대수
  dongCount: number;   // 동수
  deliveryDate: string; // 배송일 (YYYY-MM-DD)
  originalCutoffAt: string; // 전단지상 마감일 (D-4) (ISO 8601)
  cutoffAt: string;    // 변경된 마감일 (D-1) (ISO 8601)
}

export const APARTMENTS: Record<string, ApartmentConfig> = {
  '83250121': {
    code: '83250121',
    name: '베르디움',
    households: 1530,
    dongCount: 10,
    deliveryDate: '2026-02-06',
    originalCutoffAt: '2026-02-02T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-05T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250122': {
    code: '83250122',
    name: '호반써밋',
    households: 1820,
    dongCount: 10,
    deliveryDate: '2026-02-07',
    originalCutoffAt: '2026-02-03T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-06T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250123': {
    code: '83250123',
    name: 'SK뷰',
    dongRange: '101동–106동',
    households: 2100,
    dongCount: 6,
    deliveryDate: '2026-02-08',
    originalCutoffAt: '2026-02-04T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-07T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250124': {
    code: '83250124',
    name: 'SK뷰',
    dongRange: '107동–111동',
    households: 2100,
    dongCount: 5,
    deliveryDate: '2026-02-09',
    originalCutoffAt: '2026-02-05T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-08T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250125': {
    code: '83250125',
    name: '랜드마크 더샵',
    dongRange: '101동–107동',
    households: 2230,
    dongCount: 7,
    deliveryDate: '2026-02-10',
    originalCutoffAt: '2026-02-06T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-09T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250126': {
    code: '83250126',
    name: '랜드마크 더샵',
    dongRange: '108동, 201동–204동',
    households: 2230,
    dongCount: 5,
    deliveryDate: '2026-02-11',
    originalCutoffAt: '2026-02-07T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-10T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250127': {
    code: '83250127',
    name: '마리나베이',
    dongRange: '101동–112동',
    households: 3100,
    dongCount: 12,
    deliveryDate: '2026-02-12',
    originalCutoffAt: '2026-02-08T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-11T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250128': {
    code: '83250128',
    name: '마리나베이',
    dongRange: '113동–125동',
    households: 3100,
    dongCount: 13,
    deliveryDate: '2026-02-13',
    originalCutoffAt: '2026-02-09T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-12T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
  '83250129': {
    code: '83250129',
    name: 'e편한세상',
    households: 2708,
    dongCount: 15,
    deliveryDate: '2026-02-13',
    originalCutoffAt: '2026-02-09T23:00:00+09:00', // 전단지 마감일 (D-4)
    cutoffAt: '2026-02-12T23:00:00+09:00', // 변경된 마감일 (D-1)
  },
};

// 단지 목록 (셀렉트박스용)
export const APARTMENT_LIST = Object.values(APARTMENTS);

// 단지 전체 이름 (동 범위 포함)
export const getApartmentFullName = (apt: ApartmentConfig): string => {
  if (apt.dongRange) {
    return `${apt.name} (${apt.dongRange})`;
  }
  return apt.name;
};

// ============================================
// 상품 정보
// ============================================

export interface Product {
  sku: 'hotpot_cool' | 'hotpot_spicy' | 'broth_add' | 'dumpling_add';
  name: string;
  description: string;
  price: number;
  emoji: string;
  isOption?: boolean; // 추가 옵션 여부 (단골톡방 할인 미적용)
}

export const PRODUCTS: Product[] = [
  {
    sku: 'hotpot_cool',
    name: '시원 만두전골',
    description: '1인분',
    price: 15900,
    emoji: '🍲',
  },
  {
    sku: 'hotpot_spicy',
    name: '얼큰 만두전골',
    description: '1인분 (매콤)',
    price: 17900,
    emoji: '🌶️',
  },
  {
    sku: 'broth_add',
    name: '육수 추가',
    description: '1200ml',
    price: 5000,
    emoji: '🥣',
    isOption: true,
  },
  {
    sku: 'dumpling_add',
    name: '만두 추가',
    description: '8알',
    price: 7000,
    emoji: '🥟',
    isOption: true,
  },
];

// SKU로 상품 찾기
export const getProductBySku = (sku: string): Product | undefined => {
  return PRODUCTS.find((p) => p.sku === sku);
};

// ============================================
// 주문 상태 라벨 (한글)
// ============================================

export const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  CREATED: { label: '주문생성', color: 'bg-gray-500 text-white' },
  WAITING_FOR_DEPOSIT: { label: '입금대기', color: 'bg-yellow-500 text-white' },
  PAID: { label: '결제완료', color: 'bg-green-600 text-white' },
  CANCELLED: { label: '취소됨', color: 'bg-red-600 text-white' },
  CANCELED: { label: '취소됨', color: 'bg-red-600 text-white' },
  AUTO_CANCELED: { label: '자동취소', color: 'bg-red-600 text-white' },
  OUT_FOR_DELIVERY: { label: '배송중', color: 'bg-blue-600 text-white' },
  DELIVERED: { label: '배송완료', color: 'bg-purple-600 text-white' },
  LATE_DEPOSIT: { label: '결제완료 (마감후입금)', color: 'bg-green-600 text-white' },
  CANCEL_REQUESTED: { label: '계좌정보 대기', color: 'bg-yellow-500 text-white' },
  REFUND_PROCESSING: { label: '환불처리중', color: 'bg-orange-600 text-white' },
  REFUNDED: { label: '환불완료', color: 'bg-gray-500 text-white' },
};

// ============================================
// 최소 주문 수량 (하위 호환성 유지)
// ============================================

export const MIN_ORDER_QUANTITY = 1;

// ============================================
// 관리자 연락처 (Deprecated - Slack으로 전환)
// ============================================

// export const ADMIN_PHONE = '01058774424'; // 더 이상 사용하지 않음 (Slack으로 전환됨)

// ============================================
// 픽업 옵션
// ============================================

export const PICKUP_DISCOUNT = 3000;
export const PICKUP_DISCOUNT_THRESHOLD = 30000; // 픽업 할인 적용 최소 금액
export const PICKUP_MIN_ORDER_AMOUNT = 10000; // 픽업 최소 주문 금액

// 단골톡방 할인 (전골 1개당 1,000원, 추가 옵션 제외)
export const DANGOL_DISCOUNT = 1000; // 하위 호환성
export const DANGOL_DISCOUNT_PER_ITEM = 1000;
export const DANGOL_DISCOUNT_ELIGIBLE_SKUS = ['hotpot_cool', 'hotpot_spicy'] as const;

// ============================================
// 전골 이벤트 스케줄
// ============================================

/** 픽업 가능 날짜 목록 */
export const PICKUP_EVENT_DATES = ['2026-03-21', '2026-03-22'];

/** 픽업 가능 시간 슬롯 (09:00 ~ 21:00, 1시간 단위) */
export const PICKUP_EVENT_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

/** 각 픽업 날짜의 주문 마감 시각 (당일 낮 12:00) */
export const getOrderCutoffForDate = (date: string): string =>
  `${date}T12:00:00+09:00`;

/** 현재 시각 기준으로 주문 가능한 이벤트 날짜 목록 반환 */
export function getAvailableEventDates(): string[] {
  const now = new Date();
  return PICKUP_EVENT_DATES.filter((date) => {
    const cutoff = new Date(getOrderCutoffForDate(date));
    return now < cutoff;
  });
}

/** 이벤트 코드 */
export const EVENT_APT_CODE = 'EVENT';

/** 고객 문의 전화번호 */
export const CUSTOMER_SUPPORT_PHONE = '010-2592-4423';

export const STORE_INFO = {
  name: '올때만두',
  address: 'e편한세상송도 후문상가 안쪽. 컴포즈 옆 (랜드마크로 113)',
  fullAddress: '인천광역시 연수구 랜드마크로 113 e편한세상송도 후문상가 제114호 일부호',
  phone: CUSTOMER_SUPPORT_PHONE,
  email: 'info@olttefood.com',
  businessHours: '평일 09:00-18:00',
  businessNumber: '286-34-01627',
  onlineBusinessNumber: '2026-인천연수구-0365',
  ceo: '성하경',
};

/**
 * 휴대폰 인증 우회 플래그
 * - true: 인증 없이 주문 가능 (카드사 심사 기간용)
 * - false: 정상 운영 (휴대폰 인증 필수)
 * 
 * 카드사 심사 통과 후 반드시 false로 변경해야 합니다.
 */
export const SKIP_PHONE_VERIFICATION = true;

// ============================================
// 픽업 주문 설정
// ============================================

export const PICKUP_APT_CODE = 'PICKUP';

export const PICKUP_CONFIG = {
  name: '픽업주문',
  deliveryDate: '2099-12-31', // 상시 운영
  cutoffAt: '2099-12-31T23:00:00+09:00', // 마감 없음 (상시)
};

// 픽업 가능 시간 (09:00 ~ 21:00, 1시간 단위)
export const PICKUP_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

// 조기 마감 날짜별 마지막 픽업 가능 시간 (필요 시 추가)
export const PICKUP_EARLY_CLOSE_DATES: Record<string, string> = {};

// 선택된 날짜에 따라 가능한 픽업 시간 슬롯 반환
// 오늘 날짜인 경우 현재 시각 이후 슬롯만 반환
export function getAvailableTimeSlots(date: string): string[] {
  const closeTime = PICKUP_EARLY_CLOSE_DATES[date];
  let slots = closeTime
    ? PICKUP_TIME_SLOTS.filter(time => time <= closeTime)
    : [...PICKUP_TIME_SLOTS];

  // 오늘이면 현재 시각 이후만 표시
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (date === todayStr) {
    const nowHour = today.getHours();
    const nowMin = today.getMinutes();
    slots = slots.filter(time => {
      const [h] = time.split(':').map(Number);
      return h > nowHour || (h === nowHour && nowMin === 0);
    });
  }

  return slots;
}

// 오늘부터 30일간 픽업 가능 날짜 동적 생성
// 오늘은 남은 시간 슬롯이 있을 때만 포함
export function getAvailablePickupDates(): string[] {
  const now = new Date();
  const dates: string[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (i === 0) {
      // 오늘은 남은 슬롯이 있을 때만 포함
      if (getAvailableTimeSlots(dateStr).length > 0) {
        dates.push(dateStr);
      }
    } else {
      dates.push(dateStr);
    }
  }

  return dates;
}

// ============================================
// 테스트 계정 (카드사 심사 및 개발 테스트용)
// ============================================

export const TEST_PHONE_NUMBER = '01012341234'; // 정규화된 형태
export const TEST_VERIFICATION_CODE = '0000';
