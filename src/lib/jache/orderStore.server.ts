/**
 * 자체앱 주문 저장소 (서버 전용).
 *  - 시험 모드(JACHE_TEST_MODE=1): 로컬 파일 `.jache-test-orders/<id>.json` (gitignore). 운영 DB 에 쓰지 않는다
 *  - 그 밖: Supabase 표 `jache_orders` (migrations/20261118_jache_orders.sql — 아직 적용 안 함, 사장님 확인 뒤)
 *
 * 기존 `orders` 표를 쓰지 않는 이유: apt_code·dong·ho·delivery_date 같은 전골 예약 칸이 필수이고,
 * order_items.sku 가 우리 고정 상품 목록(PRODUCTS)에만 맞춰져 있어 토스포스 메뉴판 상품·옵션을 담을 수 없다.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { orderTokenSecret } from '@/lib/orderAccess.server';
import { isTestMode } from './config.server';
import type { PricedLine } from './pricing';

export type JacheStatus = 'PENDING' | 'PAID' | 'POS_SENDING' | 'POS_OK' | 'POS_FAILED' | 'CANCELLED';

export interface JacheOrder {
  id: string;
  orderDate: string; // KST yyyy-mm-dd
  dailyNo: number;
  orderNumber: string;
  status: JacheStatus;
  test: boolean;
  phone: string;
  lines: PricedLine[];
  listPrice: number;
  discountAmount: number;
  totalAmount: number;
  /** 'now' 또는 'HH:MM' */
  pickup: string;
  pickupLabel: string;
  requests: string[];
  tossPaymentKey: string | null;
  paidAt: string | null;
  posOrderId: string | null;
  posAttempts: number;
  posError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewOrder = Omit<JacheOrder, 'id' | 'orderDate' | 'dailyNo' | 'orderNumber' | 'status' | 'tossPaymentKey' | 'paidAt' | 'posOrderId' | 'posAttempts' | 'posError' | 'createdAt' | 'updatedAt'>;

/* ───────── 공통 ───────── */

export function kstDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const ID_RE = /^JC\d{6}[A-Z2-9]{10}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 토스페이먼츠 orderId(6~64자 영숫자)로도 그대로 쓰는 주문 id. 예: JC261118K3F9A2QZXW */
function newId(date: string): string {
  const bytes = randomBytes(10);
  let r = '';
  for (let i = 0; i < bytes.length; i++) r += ALPHABET[bytes[i] % ALPHABET.length];
  return `JC${date.slice(2).replace(/-/g, '')}${r}`;
}

export const isOrderId = (id: unknown): id is string => typeof id === 'string' && ID_RE.test(id);

export function formatOrderNumber(dailyNo: number, test: boolean): string {
  return `${test ? '테스트-' : ''}앱-${String(dailyNo).padStart(3, '0')}`;
}

/** 완료 화면·승인 호출용 주문 열쇠 */
export function orderToken(id: string): string {
  return createHmac('sha256', orderTokenSecret()).update(`jache-order:${id}`).digest('base64url').slice(0, 32);
}
export function verifyOrderTokenFor(id: string, token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 32) return false;
  const a = Buffer.from(orderToken(id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Backend {
  create(o: NewOrder): Promise<JacheOrder>;
  get(id: string): Promise<JacheOrder | null>;
  /** 이 번호의 주문 전부 (2번째 주문 할인 자격 판정용) */
  listByPhone(phone: string): Promise<JacheOrder[]>;
  /** expect 상태일 때만 바꾼다 (동시 호출 방지). 바뀐 주문 또는 null */
  update(id: string, patch: Partial<JacheOrder>, expect?: JacheStatus[]): Promise<JacheOrder | null>;
  /** 포스 웹훅의 orderId(포스 주문 id)·orderKey(우리 id)로 시험 아닌 주문 찾기 */
  findByPos(posOrderId: string, orderKey: string): Promise<JacheOrder | null>;
  /** 멈춤·포스 실패 되살피기 대상: PAID·POS_SENDING·POS_FAILED 이고 결제가 since 이후 */
  listForRecovery(sinceIso: string): Promise<JacheOrder[]>;
}

const RECOVERY_STATUSES: JacheStatus[] = ['PAID', 'POS_SENDING', 'POS_FAILED'];
const safeKey = (s: string) => s.replace(/[^0-9A-Za-z_-]/g, '');

function fresh(o: NewOrder, id: string, date: string, dailyNo: number): JacheOrder {
  const now = new Date().toISOString();
  return {
    ...o,
    id,
    orderDate: date,
    dailyNo,
    orderNumber: formatOrderNumber(dailyNo, o.test),
    status: 'PENDING',
    tossPaymentKey: null,
    paidAt: null,
    posOrderId: null,
    posAttempts: 0,
    posError: null,
    createdAt: now,
    updatedAt: now,
  };
}

/* ───────── 파일 (시험 모드) ───────── */

const dir = () => process.env.JACHE_ORDER_DIR || path.join(process.cwd(), '.jache-test-orders');
let fileLock: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = fileLock.then(fn, fn);
  fileLock = run.catch(() => undefined);
  return run;
}

const fileBackend: Backend = {
  create: (o) =>
    locked(async () => {
      await fs.mkdir(dir(), { recursive: true });
      const date = kstDate();
      const names = await fs.readdir(dir());
      let max = 0;
      for (const n of names.filter((x) => x.endsWith('.json'))) {
        try {
          const j = JSON.parse(await fs.readFile(path.join(dir(), n), 'utf8')) as JacheOrder;
          if (j.orderDate === date) max = Math.max(max, j.dailyNo);
        } catch {
          /* 깨진 파일 무시 */
        }
      }
      const order = fresh(o, newId(date), date, max + 1);
      await fs.writeFile(path.join(dir(), `${order.id}.json`), JSON.stringify(order, null, 2));
      return order;
    }),
  get: async (id) => {
    if (!isOrderId(id)) return null;
    try {
      return JSON.parse(await fs.readFile(path.join(dir(), `${id}.json`), 'utf8')) as JacheOrder;
    } catch {
      return null;
    }
  },
  listByPhone: async (phone) => {
    let names: string[] = [];
    try {
      names = await fs.readdir(dir());
    } catch {
      return [];
    }
    const out: JacheOrder[] = [];
    for (const n of names.filter((x) => x.endsWith('.json'))) {
      try {
        const j = JSON.parse(await fs.readFile(path.join(dir(), n), 'utf8')) as JacheOrder;
        if (j.phone === phone) out.push(j);
      } catch {
        /* 깨진 파일 무시 */
      }
    }
    return out;
  },
  update: (id, patch, expect) =>
    locked(async () => {
      const cur = await fileBackend.get(id);
      if (!cur || (expect && !expect.includes(cur.status))) return null;
      const next = { ...cur, ...patch, id: cur.id, updatedAt: new Date().toISOString() };
      await fs.writeFile(path.join(dir(), `${id}.json`), JSON.stringify(next, null, 2));
      return next;
    }),
  findByPos: async (posOrderId, orderKey) => {
    for (const o of await readAll()) if (!o.test && ((posOrderId && o.posOrderId === posOrderId) || (orderKey && o.id === orderKey))) return o;
    return null;
  },
  listForRecovery: async (sinceIso) =>
    (await readAll()).filter((o) => RECOVERY_STATUSES.includes(o.status) && !!o.paidAt && o.paidAt >= sinceIso).slice(0, 20),
};

async function readAll(): Promise<JacheOrder[]> {
  let names: string[] = [];
  try {
    names = await fs.readdir(dir());
  } catch {
    return [];
  }
  const out: JacheOrder[] = [];
  for (const n of names.filter((x) => x.endsWith('.json'))) {
    try {
      out.push(JSON.parse(await fs.readFile(path.join(dir(), n), 'utf8')) as JacheOrder);
    } catch {
      /* 깨진 파일 무시 */
    }
  }
  return out;
}

/* ───────── Supabase 표 jache_orders (마이그레이션 적용 뒤) ───────── */

const COLS: Record<keyof JacheOrder, string> = {
  id: 'id',
  orderDate: 'order_date',
  dailyNo: 'daily_no',
  orderNumber: 'order_number',
  status: 'status',
  test: 'is_test',
  phone: 'phone',
  lines: 'lines',
  listPrice: 'list_price',
  discountAmount: 'discount_amount',
  totalAmount: 'total_amount',
  pickup: 'pickup',
  pickupLabel: 'pickup_label',
  requests: 'requests',
  tossPaymentKey: 'toss_payment_key',
  paidAt: 'paid_at',
  posOrderId: 'pos_order_id',
  posAttempts: 'pos_attempts',
  posError: 'pos_error',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};
const toRow = (o: Partial<JacheOrder>) => {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (k in COLS) r[COLS[k as keyof JacheOrder]] = v;
  return r;
};
const fromRow = (r: Record<string, any>): JacheOrder => {
  const o: Record<string, unknown> = {};
  for (const [k, c] of Object.entries(COLS)) o[k] = r[c];
  return o as unknown as JacheOrder;
};

const dbBackend: Backend = {
  async create(o) {
    const supabase: any = createServerSupabaseClient();
    const date = kstDate();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: last } = await supabase.from('jache_orders').select('daily_no').eq('order_date', date).order('daily_no', { ascending: false }).limit(1);
      const order = fresh(o, newId(date), date, (last?.[0]?.daily_no ?? 0) + 1);
      const { error } = await supabase.from('jache_orders').insert(toRow(order));
      if (!error) return order;
      if (error.code !== '23505') throw new Error(`jache_orders 저장 실패: ${error.message}`);
    }
    throw new Error('주문번호를 만들지 못했습니다');
  },
  async get(id) {
    if (!isOrderId(id)) return null;
    const supabase: any = createServerSupabaseClient();
    const { data } = await supabase.from('jache_orders').select('*').eq('id', id).maybeSingle();
    return data ? fromRow(data) : null;
  },
  async listByPhone(phone) {
    const supabase: any = createServerSupabaseClient();
    const { data, error } = await supabase.from('jache_orders').select('*').eq('phone', phone);
    if (error) throw new Error(`jache_orders 조회 실패: ${error.message}`);
    return (data ?? []).map(fromRow);
  },
  async update(id, patch, expect) {
    const supabase: any = createServerSupabaseClient();
    let q = supabase.from('jache_orders').update(toRow({ ...patch, updatedAt: new Date().toISOString() })).eq('id', id);
    if (expect) q = q.in('status', expect);
    const { data, error } = await q.select('*');
    if (error) throw new Error(`jache_orders 갱신 실패: ${error.message}`);
    return data?.[0] ? fromRow(data[0]) : null;
  },
  async findByPos(posOrderId, orderKey) {
    const a = safeKey(posOrderId);
    const b = safeKey(orderKey);
    if (!a && !b) return null;
    const supabase: any = createServerSupabaseClient();
    const conds = [a && `pos_order_id.eq.${a}`, b && `id.eq.${b}`].filter(Boolean).join(',');
    const { data, error } = await supabase.from('jache_orders').select('*').or(conds).eq('is_test', false).limit(1);
    if (error) throw new Error(`jache_orders 조회 실패: ${error.message}`);
    return data?.[0] ? fromRow(data[0]) : null;
  },
  async listForRecovery(sinceIso) {
    const supabase: any = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('jache_orders')
      .select('*')
      .in('status', RECOVERY_STATUSES)
      .gte('paid_at', sinceIso)
      .order('paid_at', { ascending: true })
      .limit(20);
    if (error) throw new Error(`jache_orders 조회 실패: ${error.message}`);
    return (data ?? []).map(fromRow);
  },
};

export const orderStore = (): Backend => (isTestMode() ? fileBackend : dbBackend);
