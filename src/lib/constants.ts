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
  deliveryDate: string; // 배송일 (YYYY-MM-DD)
  cutoffAt: string;    // 마감 시간 (ISO 8601)
}

export const APARTMENTS: Record<string, ApartmentConfig> = {
  '8_oceanpark': {
    code: '8_oceanpark',
    name: '8공구 송도 오션파크 베르디움',
    deliveryDate: '2026-01-31',
    cutoffAt: '2026-01-29T23:00:00+09:00',
  },
  '8_hoban': {
    code: '8_hoban',
    name: '8공구 호반써밋 송도',
    deliveryDate: '2026-02-01',
    cutoffAt: '2026-01-30T23:00:00+09:00',
  },
  '8_skview': {
    code: '8_skview',
    name: '8공구 송도 SK뷰',
    deliveryDate: '2026-02-02',
    cutoffAt: '2026-01-31T23:00:00+09:00',
  },
  '8_ephyun': {
    code: '8_ephyun',
    name: '8공구 e편한세상 송도',
    deliveryDate: '2026-02-03',
    cutoffAt: '2026-02-01T23:00:00+09:00',
  },
  '8_landmark': {
    code: '8_landmark',
    name: '8공구 랜드마크시티 센트럴 더샵',
    deliveryDate: '2026-02-04',
    cutoffAt: '2026-02-02T23:00:00+09:00',
  },
  '6_hill_12': {
    code: '6_hill_12',
    name: '6공구 힐스테이트 레이크 1+2차',
    deliveryDate: '2026-02-06',
    cutoffAt: '2026-02-04T23:00:00+09:00',
  },
  '6_hill_3': {
    code: '6_hill_3',
    name: '6공구 힐스테이트 레이크 3차',
    deliveryDate: '2026-02-07',
    cutoffAt: '2026-02-05T23:00:00+09:00',
  },
  '6_lux': {
    code: '6_lux',
    name: '6공구 송도 럭스오션 SK뷰',
    deliveryDate: '2026-02-09',
    cutoffAt: '2026-02-07T23:00:00+09:00',
  },
  '6_xi_crystal': {
    code: '6_xi_crystal',
    name: '6공구 송도 자이 크리스탈오션',
    deliveryDate: '2026-02-11',
    cutoffAt: '2026-02-09T23:00:00+09:00',
  },
  '6_xi_star': {
    code: '6_xi_star',
    name: '6공구 자이 더 스타',
    deliveryDate: '2026-02-13',
    cutoffAt: '2026-02-11T23:00:00+09:00',
  },
};

// 단지 목록 (셀렉트박스용)
export const APARTMENT_LIST = Object.values(APARTMENTS);

// ============================================
// 상품 정보 (PRD 3. 상품 구성)
// ============================================

export interface Product {
  sku: 'meat' | 'kimchi' | 'half' | 'ricecake_1kg';
  name: string;
  description: string;
  price: number;
  emoji: string;
}

export const PRODUCTS: Product[] = [
  {
    sku: 'meat',
    name: '고기만두',
    description: '1팩 8개, 약 450g',
    price: 10000,
    emoji: '🥟',
  },
  {
    sku: 'kimchi',
    name: '김치만두',
    description: '1팩 8개, 약 450g (매콤)',
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
