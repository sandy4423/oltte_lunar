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
  | 'LATE_DEPOSIT';       // (예외) 마감 후 입금

/** 상품 SKU - schema.sql line 6 */
export type ProductSku =
  | 'meat'          // 고기만두
  | 'kimchi'        // 김치만두
  | 'half'          // 반반만두
  | 'ricecake_1kg'; // 떡국떡 1kg

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
  portone_payment_id: string | null; // text, NULLABLE
  paid_at: string | null;          // timestamptz, NULLABLE
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
  portone_payment_id?: string | null; // optional
  paid_at?: string | null;         // optional
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
  portone_payment_id?: string | null;
  paid_at?: string | null;
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
// Utility Types (편의용 별칭)
// ============================================

/** 테이블 Row 타입 별칭 */
export type Customer = CustomerRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;

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
