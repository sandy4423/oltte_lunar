/** 자체앱 주문 창 공용 타입 (손님 화면 + /api/menu 응답 + 장바구니) */

export interface MenuChoice {
  id: string;
  title: string;
  price: number;
  soldOut: boolean;
  /** 선택지마다 수량을 받는가 (예: 계란 반쪽 추가 x2) */
  qtyEnabled: boolean;
  maxQty: number;
}

export interface MenuOptionGroup {
  id: string;
  title: string;
  required: boolean;
  /** 고를 수 있는 선택지 종류 수 */
  min: number;
  max: number;
  choices: MenuChoice[];
}

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  soldOut: boolean;
  labels: string[];
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
  /** 15,000원 이상 증정 상품 (없거나 품절이면 null → 이벤트 문구 없음) */
  gift: import('./gift').GiftItem | null;
  fetchedAt: string;
}

/** 장바구니에 담긴 선택지 한 줄 */
export interface CartChoice {
  optionId: string;
  optionTitle: string;
  choiceId: string;
  title: string;
  price: number;
  qty: number;
}

export interface CartLine {
  /** 같은 상품·같은 옵션이면 같은 키 (수량만 합친다) */
  key: string;
  itemId: string;
  title: string;
  basePrice: number;
  imageUrl: string | null;
  qty: number;
  choices: CartChoice[];
}
