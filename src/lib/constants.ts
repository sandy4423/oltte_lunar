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
// 상품 정보 (PRD 3. 상품 구성)
// ============================================

export interface Product {
  sku: 'meat' | 'kimchi' | 'half' | 'ricecake_1kg' | 'broth_1200ml';
  name: string;
  description: string;
  price: number;
  emoji: string;
}

export const PRODUCTS: Product[] = [
  {
    sku: 'meat',
    name: '고기만두',
    description: '1팩 8알',
    price: 10000,
    emoji: '🥟',
  },
  {
    sku: 'kimchi',
    name: '김치만두',
    description: '1팩 8알 (매콤)',
    price: 10000,
    emoji: '🌶️',
  },
  {
    sku: 'half',
    name: '반반만두',
    description: '고기4 + 김치4',
    price: 10000,
    emoji: '🥟',
  },
  {
    sku: 'ricecake_1kg',
    name: '떡국떡',
    description: '1kg',
    price: 10000,
    emoji: '🍚',
  },
  {
    sku: 'broth_1200ml',
    name: '양지육수',
    description: '1200ml',
    price: 5000,
    emoji: '🍲',
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
  AUTO_CANCELED: { label: '자동취소', color: 'bg-red-600 text-white' },
  OUT_FOR_DELIVERY: { label: '배송중', color: 'bg-blue-600 text-white' },
  DELIVERED: { label: '배송완료', color: 'bg-purple-600 text-white' },
  LATE_DEPOSIT: { label: '결제완료 (마감후입금)', color: 'bg-green-600 text-white' },
  CANCEL_REQUESTED: { label: '계좌정보 대기', color: 'bg-yellow-500 text-white' },
  REFUND_PROCESSING: { label: '환불처리중', color: 'bg-orange-600 text-white' },
  REFUNDED: { label: '환불완료', color: 'bg-gray-500 text-white' },
};

// ============================================
// 최소 주문 수량
// ============================================

export const MIN_ORDER_QUANTITY = 3;

// 무료배송 조건에 포함되는 상품 (만두, 떡만)
export const FREE_SHIPPING_ELIGIBLE_SKUS = ['meat', 'kimchi', 'half', 'ricecake_1kg'] as const;

// ============================================
// 관리자 연락처 (Deprecated - Slack으로 전환)
// ============================================

// export const ADMIN_PHONE = '01058774424'; // 더 이상 사용하지 않음 (Slack으로 전환됨)

// ============================================
// 픽업 옵션
// ============================================

export const PICKUP_DISCOUNT = 3000;

export const STORE_INFO = {
  name: '올때만두',
  address: 'e편한세상송도 후문상가 안쪽. 컴포즈 옆 (랜드마크로 113)',
  fullAddress: '인천광역시 연수구 랜드마크로 113 e편한세상송도 후문상가 제114호 일부호',
  phone: '010-2592-4423',
  email: 'info@olttefood.com',
  businessHours: '평일 09:00-18:00',
  businessNumber: '286-34-01627',
  ceo: '성하경',
};

// ============================================
// 픽업 주문 설정
// ============================================

export const PICKUP_APT_CODE = 'PICKUP';

export const PICKUP_CONFIG = {
  name: '픽업주문',
  deliveryDate: '2026-02-14', // 픽업 가능 마지막 날짜
  cutoffAt: '2026-02-13T23:00:00+09:00', // 주문 마감
};

// 픽업 가능 날짜 (2/6 ~ 2/14)
export const PICKUP_AVAILABLE_DATES = [
  '2026-02-06',
  '2026-02-07',
  '2026-02-08',
  '2026-02-09',
  '2026-02-10',
  '2026-02-11',
  '2026-02-12',
  '2026-02-13',
  '2026-02-14',
];

// 픽업 가능 시간 (09:00 ~ 21:00, 1시간 단위)
export const PICKUP_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

// 조기 마감 날짜별 마지막 픽업 가능 시간
export const PICKUP_EARLY_CLOSE_DATES: Record<string, string> = {
  '2026-02-14': '13:00', // 토요일 오후 1시 마감
};

// 선택된 날짜에 따라 가능한 픽업 시간 슬롯 반환
export function getAvailableTimeSlots(date: string): string[] {
  const closeTime = PICKUP_EARLY_CLOSE_DATES[date];
  if (closeTime) {
    return PICKUP_TIME_SLOTS.filter(time => time <= closeTime);
  }
  return PICKUP_TIME_SLOTS;
}

// ============================================
// 테스트 계정 (카드사 심사 및 개발 테스트용)
// ============================================

export const TEST_PHONE_NUMBER = '01012341234'; // 정규화된 형태
export const TEST_VERIFICATION_CODE = '0000';
