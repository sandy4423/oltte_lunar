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
  cutoffAt: string;    // 마감 시간 (ISO 8601)
}

export const APARTMENTS: Record<string, ApartmentConfig> = {
  '83250121': {
    code: '83250121',
    name: '베르디움',
    households: 1530,
    dongCount: 10,
    deliveryDate: '2026-02-06',
    cutoffAt: '2026-02-02T23:00:00+09:00',
  },
  '83250122': {
    code: '83250122',
    name: '호반써밋',
    households: 1820,
    dongCount: 10,
    deliveryDate: '2026-02-07',
    cutoffAt: '2026-02-03T23:00:00+09:00',
  },
  '83250123': {
    code: '83250123',
    name: 'SK뷰',
    dongRange: '101동–106동',
    households: 2100,
    dongCount: 6,
    deliveryDate: '2026-02-08',
    cutoffAt: '2026-02-04T23:00:00+09:00',
  },
  '83250124': {
    code: '83250124',
    name: 'SK뷰',
    dongRange: '107동–111동',
    households: 2100,
    dongCount: 5,
    deliveryDate: '2026-02-09',
    cutoffAt: '2026-02-05T23:00:00+09:00',
  },
  '83250125': {
    code: '83250125',
    name: '랜드마크 더샵',
    dongRange: '101동–107동',
    households: 2230,
    dongCount: 7,
    deliveryDate: '2026-02-10',
    cutoffAt: '2026-02-06T23:00:00+09:00',
  },
  '83250126': {
    code: '83250126',
    name: '랜드마크 더샵',
    dongRange: '108동, 201동–204동',
    households: 2230,
    dongCount: 5,
    deliveryDate: '2026-02-11',
    cutoffAt: '2026-02-07T23:00:00+09:00',
  },
  '83250127': {
    code: '83250127',
    name: '마리나베이',
    dongRange: '101동–112동',
    households: 3100,
    dongCount: 12,
    deliveryDate: '2026-02-12',
    cutoffAt: '2026-02-08T23:00:00+09:00',
  },
  '83250128': {
    code: '83250128',
    name: '마리나베이',
    dongRange: '113동–125동',
    households: 3100,
    dongCount: 13,
    deliveryDate: '2026-02-13',
    cutoffAt: '2026-02-09T23:00:00+09:00',
  },
  '83250129': {
    code: '83250129',
    name: 'e편한세상',
    households: 2708,
    dongCount: 15,
    deliveryDate: '2026-02-13',
    cutoffAt: '2026-02-09T23:00:00+09:00',
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
    description: '고기4 + 김치4, 약 450g',
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
  CREATED: { label: '주문생성', color: 'bg-gray-100 text-gray-800' },
  WAITING_FOR_DEPOSIT: { label: '입금대기', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: '결제완료', color: 'bg-green-100 text-green-800' },
  AUTO_CANCELED: { label: '자동취소', color: 'bg-red-100 text-red-800' },
  OUT_FOR_DELIVERY: { label: '배송중', color: 'bg-blue-100 text-blue-800' },
  DELIVERED: { label: '배송완료', color: 'bg-purple-100 text-purple-800' },
  LATE_DEPOSIT: { label: '마감후입금', color: 'bg-orange-100 text-orange-800' },
};

// ============================================
// 최소 주문 수량
// ============================================

export const MIN_ORDER_QUANTITY = 3;
