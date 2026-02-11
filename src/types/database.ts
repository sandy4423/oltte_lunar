/**
 * Supabase Database Type Definitions
 * Generated from: schema.sql
 * 
 * 이 파일은 schema.sql과 1:1 매칭되어야 합니다.
 */

// ============================================
// ENUM Types (String Unions)
// ============================================

/** 주문 상태 - schema.sql line 2-5 */
export type OrderStatus =
  | 'CREATED'             // 주문 생성 (가상계좌 발급 전)
  | 'WAITING_FOR_DEPOSIT' // 가상계좌 발급 완료, 입금 대기
  | 'PAID'                // 결제 완료 (입금 확인)
  | 'AUTO_CANCELED'       // 마감 미입금 자동 취소
  | 'OUT_FOR_DELIVERY'    // 배송중
  | 'DELIVERED'           // 배송완료
  | 'LATE_DEPOSIT'        // (예외) 마감 후 입금
  | 'CANCEL_REQUESTED'    // 취소 요청됨 (계좌정보 대기)
  | 'REFUND_PROCESSING'   // 환불 처리 중
  | 'REFUNDED';           // 환불 완료

/** 상품 SKU - schema.sql line 6 */
export type ProductSku =
  | 'meat'          // 고기만두
  | 'kimchi'        // 김치만두
  | 'half'          // 반반만두
  | 'ricecake_1kg'  // 떡국떡 1kg
  | 'broth_1200ml'; // 양지육수 1200ml

// ============================================
// Table Row Types (SELECT 결과)
// ============================================

/** customers 테이블 Row - schema.sql line 9-15 */
export interface CustomerRow {
  id: string;                      // uuid, PK
  phone: string;                   // text, NOT NULL, UNIQUE
  name: string;                    // text, NOT NULL
  marketing_opt_in: boolean;       // boolean, DEFAULT false
  created_at: string;              // timestamptz, DEFAULT now()
}

/** orders 테이블 Row - schema.sql line 18-38 */
export interface OrderRow {
  id: string;                      // uuid, PK
  customer_id: string;             // uuid, FK → customers(id), NOT NULL
  apt_code: string;                // text, NOT NULL
  apt_name: string;                // text, NOT NULL
  dong: string;                    // text, NOT NULL
  ho: string;                      // text, NOT NULL
  delivery_date: string;           // date, NOT NULL
  cutoff_at: string;               // timestamptz, NOT NULL
  status: OrderStatus;             // order_status, DEFAULT 'CREATED'
  total_qty: number;               // int, NOT NULL, CHECK >= 3
  total_amount: number;            // int, NOT NULL
  payment_method: string;          // text, DEFAULT 'vbank'
  vbank_num: string | null;        // text, NULLABLE
  vbank_bank: string | null;       // text, NULLABLE
  vbank_holder: string | null;     // text, NULLABLE
  vbank_expires_at: string | null; // timestamptz, NULLABLE
  toss_payment_key: string | null; // text, NULLABLE
  toss_secret: string | null;      // text, NULLABLE
  portone_payment_id: string | null; // text, NULLABLE (deprecated)
  paid_at: string | null;          // timestamptz, NULLABLE
  is_pickup: boolean;              // boolean, DEFAULT false
  pickup_discount: number;         // int, DEFAULT 0
  pickup_date: string | null;      // date, NULLABLE - 픽업 날짜
  pickup_time: string | null;      // text, NULLABLE - 픽업 시간
  dangol_discount: number;         // int, DEFAULT 0 - 단골톡방 할인
  source: string | null;           // text, NULLABLE - 유입 경로
  refund_amount: number | null;    // int, NULLABLE - 환불 금액
  refund_reason: string | null;    // text, NULLABLE - 환불 사유
  refund_bank_code: string | null; // text, NULLABLE - 환불 계좌 은행 코드
  refund_account_number: string | null; // text, NULLABLE - 환불 계좌번호
  refund_account_holder: string | null; // text, NULLABLE - 환불 계좌 예금주
  refunded_at: string | null;      // timestamptz, NULLABLE - 환불 처리 일시
  cash_receipt_type: string | null; // text, NULLABLE - 현금영수증 종류 (소득공제/지출증빙)
  cash_receipt_number: string | null; // text, NULLABLE - 현금영수증 등록번호
  cash_receipt_issued: boolean;    // boolean, DEFAULT false - 현금영수증 발급 완료 여부
  cash_receipt_url: string | null; // text, NULLABLE - 발급된 현금영수증 URL
  cash_receipt_key: string | null; // text, NULLABLE - 토스페이먼츠 현금영수증 고유키
  is_hidden: boolean;              // boolean, DEFAULT false - 테스트 주문 등 숨김 처리 여부
  created_at: string;              // timestamptz, DEFAULT now()
  updated_at: string;              // timestamptz, DEFAULT now()
}

/** order_items 테이블 Row - schema.sql line 41-48 */
export interface OrderItemRow {
  id: string;                      // uuid, PK
  order_id: string;                // uuid, FK → orders(id) ON DELETE CASCADE, NOT NULL
  sku: ProductSku;                 // product_sku, NOT NULL
  qty: number;                     // int, NOT NULL, DEFAULT 1
  unit_price: number;              // int, NOT NULL
  line_amount: number;             // int, NOT NULL (qty * unit_price)
}

/** refund_tokens 테이블 Row */
export interface RefundTokenRow {
  id: string;                      // uuid, PK
  order_id: string;                // uuid, FK → orders(id), NOT NULL
  token: string;                   // text, NOT NULL, UNIQUE
  refund_amount: number;           // int, NOT NULL
  refund_reason: string;           // text, NOT NULL
  bank_code: string | null;        // text, NULLABLE
  account_number: string | null;   // text, NULLABLE
  account_holder: string | null;   // text, NULLABLE
  used: boolean;                   // boolean, DEFAULT false
  expires_at: string;              // timestamptz, NOT NULL
  created_at: string;              // timestamptz, DEFAULT now()
}

// ============================================
// Table Insert Types (INSERT 시 사용)
// ============================================

/** customers INSERT 타입 */
export interface CustomerInsert {
  id?: string;                     // auto-generated
  phone: string;                   // required
  name: string;                    // required
  marketing_opt_in?: boolean;      // optional, default: false
  created_at?: string;             // optional, default: now()
}

/** orders INSERT 타입 */
export interface OrderInsert {
  id?: string;                     // auto-generated
  customer_id: string;             // required
  apt_code: string;                // required
  apt_name: string;                // required
  dong: string;                    // required
  ho: string;                      // required
  delivery_date: string;           // required
  cutoff_at: string;               // required
  status?: OrderStatus;            // optional, default: 'CREATED'
  total_qty: number;               // required, must be >= 3
  total_amount: number;            // required
  payment_method?: string;         // optional, default: 'vbank'
  vbank_num?: string | null;       // optional
  vbank_bank?: string | null;      // optional
  vbank_holder?: string | null;    // optional
  vbank_expires_at?: string | null; // optional
  toss_payment_key?: string | null; // optional
  toss_secret?: string | null;     // optional
  portone_payment_id?: string | null; // optional (deprecated)
  paid_at?: string | null;         // optional
  is_pickup?: boolean;             // optional, default: false
  pickup_discount?: number;        // optional, default: 0
  pickup_date?: string | null;     // optional - 픽업 날짜
  pickup_time?: string | null;     // optional - 픽업 시간
  dangol_discount?: number;        // optional, default: 0 - 단골톡방 할인
  source?: string | null;          // optional - 유입 경로
  refund_amount?: number | null;   // optional
  refund_reason?: string | null;   // optional
  refund_bank_code?: string | null; // optional
  refund_account_number?: string | null; // optional
  refund_account_holder?: string | null; // optional
  refunded_at?: string | null;     // optional
  cash_receipt_type?: string | null; // optional - 현금영수증 종류
  cash_receipt_number?: string | null; // optional - 현금영수증 등록번호
  cash_receipt_issued?: boolean;   // optional, default: false
  cash_receipt_url?: string | null; // optional - 발급된 현금영수증 URL
  cash_receipt_key?: string | null; // optional - 토스페이먼츠 현금영수증 고유키
  is_hidden?: boolean;             // optional, default: false
  created_at?: string;             // optional, default: now()
  updated_at?: string;             // optional, default: now()
}

/** order_items INSERT 타입 */
export interface OrderItemInsert {
  id?: string;                     // auto-generated
  order_id: string;                // required
  sku: ProductSku;                 // required
  qty?: number;                    // optional, default: 1
  unit_price: number;              // required
  line_amount: number;             // required
}

/** refund_tokens INSERT 타입 */
export interface RefundTokenInsert {
  id?: string;                     // auto-generated
  order_id: string;                // required
  token: string;                   // required
  refund_amount: number;           // required
  refund_reason: string;           // required
  bank_code?: string | null;       // optional
  account_number?: string | null;  // optional
  account_holder?: string | null;  // optional
  used?: boolean;                  // optional, default: false
  expires_at: string;              // required
  created_at?: string;             // optional, default: now()
}

// ============================================
// Table Update Types (UPDATE 시 사용)
// ============================================

/** customers UPDATE 타입 */
export interface CustomerUpdate {
  id?: string;
  phone?: string;
  name?: string;
  marketing_opt_in?: boolean;
  created_at?: string;
}

/** orders UPDATE 타입 */
export interface OrderUpdate {
  id?: string;
  customer_id?: string;
  apt_code?: string;
  apt_name?: string;
  dong?: string;
  ho?: string;
  delivery_date?: string;
  cutoff_at?: string;
  status?: OrderStatus;
  total_qty?: number;
  total_amount?: number;
  payment_method?: string;
  vbank_num?: string | null;
  vbank_bank?: string | null;
  vbank_holder?: string | null;
  vbank_expires_at?: string | null;
  toss_payment_key?: string | null;
  toss_secret?: string | null;
  portone_payment_id?: string | null;
  paid_at?: string | null;
  is_pickup?: boolean;
  pickup_discount?: number;
  pickup_date?: string | null;
  pickup_time?: string | null;
  dangol_discount?: number;
  source?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refund_bank_code?: string | null;
  refund_account_number?: string | null;
  refund_account_holder?: string | null;
  refunded_at?: string | null;
  cash_receipt_type?: string | null;
  cash_receipt_number?: string | null;
  cash_receipt_issued?: boolean;
  cash_receipt_url?: string | null;
  cash_receipt_key?: string | null;
  is_hidden?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** order_items UPDATE 타입 */
export interface OrderItemUpdate {
  id?: string;
  order_id?: string;
  sku?: ProductSku;
  qty?: number;
  unit_price?: number;
  line_amount?: number;
}

/** refund_tokens UPDATE 타입 */
export interface RefundTokenUpdate {
  id?: string;
  order_id?: string;
  token?: string;
  refund_amount?: number;
  refund_reason?: string;
  bank_code?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  used?: boolean;
  expires_at?: string;
  created_at?: string;
}

// ============================================
// Supabase Database Interface
// ============================================

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
      };
      refund_tokens: {
        Row: RefundTokenRow;
        Insert: RefundTokenInsert;
        Update: RefundTokenUpdate;
      };
      product_shipment_quantities: {
        Row: ProductShipmentQuantityRow;
        Insert: ProductShipmentQuantityInsert;
        Update: ProductShipmentQuantityUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: OrderStatus;
      product_sku: ProductSku;
    };
  };
}

// ============================================
// product_shipment_quantities 테이블 (출하 수량 관리)
// ============================================

/** product_shipment_quantities 테이블 Row */
export interface ProductShipmentQuantityRow {
  id: string;                      // uuid, PK
  sku: ProductSku;                 // product_sku, NOT NULL
  shipment_date: string;           // date, NOT NULL
  quantity: number;                // integer, NOT NULL, DEFAULT 0
  created_at: string;              // timestamptz, DEFAULT now()
  updated_at: string;              // timestamptz, DEFAULT now()
}

/** product_shipment_quantities INSERT 타입 */
export interface ProductShipmentQuantityInsert {
  id?: string;
  sku: ProductSku;
  shipment_date: string;
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

/** product_shipment_quantities UPDATE 타입 */
export interface ProductShipmentQuantityUpdate {
  id?: string;
  sku?: ProductSku;
  shipment_date?: string;
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Utility Types (편의용 별칭)
// ============================================

/** 테이블 Row 타입 별칭 */
export type Customer = CustomerRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;
export type RefundToken = RefundTokenRow;

/** 주문 + 고객정보 조인 결과 */
export interface OrderWithCustomer extends OrderRow {
  customer: CustomerRow;
}

/** 주문 + 주문상품 조인 결과 */
export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

/** 주문 전체 정보 (고객 + 상품) */
export interface OrderFull extends OrderRow {
  customer: CustomerRow;
  order_items: OrderItemRow[];
}
