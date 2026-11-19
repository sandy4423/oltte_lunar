/**
 * 토스포스 오픈API (서버 전용 — 클라이언트 컴포넌트에서 import 금지).
 * 키는 환경변수에서만 읽고 어떤 응답에도 싣지 않는다.
 *   TOSSPLACE_OPENAPI_ACCESS_KEY / TOSSPLACE_OPENAPI_SECRET / TOSSPLACE_MERCHANT_ID
 */
import type { MenuCategory, MenuChoice, MenuItem, MenuOptionGroup } from '@/lib/jache/types';
import type { PricedLine } from '@/lib/jache/pricing';
import { splitVat } from '@/lib/jache/pricing';

const BASE = 'https://open-api.tossplace.com/api-public/openapi/v1';

/* ───────── 카탈로그 원본 형태 (쓰는 필드만) ───────── */

interface RawChoice {
  id: string;
  title: string;
  state: string;
  enabled: boolean;
  priceValue: number;
  quantityEnabled: boolean;
  maxQuantity: number;
}
interface RawOption {
  id: string;
  title: string;
  enabled: boolean;
  required: boolean;
  minChoices: number;
  maxChoices: number;
  choices: RawChoice[];
}
interface RawItem {
  id: string;
  title: string;
  state: string;
  enabled: boolean;
  order: number;
  description: string | null;
  imageUrl: string | null;
  labels: string[] | null;
  price: { title?: string; priceType?: string; priceUnit?: number; priceValue: number } | null;
  diningOptions: string[] | null;
  category: { id: string; title: string; enabled: boolean; order: number };
  options: RawOption[] | null;
}

function credentials() {
  const accessKey = process.env.TOSSPLACE_OPENAPI_ACCESS_KEY;
  const secret = process.env.TOSSPLACE_OPENAPI_SECRET;
  const merchantId = process.env.TOSSPLACE_MERCHANT_ID;
  if (!accessKey || !secret || !merchantId) throw new Error('토스포스 환경변수가 없습니다');
  return { accessKey, secret, merchantId };
}

export async function tossplaceFetch<T>(path: string, init?: RequestInit & { next?: { revalidate: number } }): Promise<T> {
  const { accessKey, secret, merchantId } = credentials();
  const res = await fetch(`${BASE}/merchants/${merchantId}${path}`, {
    ...init,
    headers: {
      'x-access-key': accessKey,
      'x-secret-key': secret,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`토스포스 응답 ${res.status}`);
  const body = (await res.json()) as { resultType?: string; success?: T };
  if (body.resultType && body.resultType !== 'SUCCESS') throw new Error('토스포스 결과 실패');
  return body.success as T;
}

/* ───────── 메뉴 정리 ───────── */

const EXCLUDE_CATEGORIES = new Set(['Pregnancy']);
const EXCLUDE_TITLES = new Set(['교자 2+1 행사', '쫄면 1+1', '공기밥']); // 공기밥: 사장님 11-19 「공기밥도 숨겨」
const MAX_QTY_CAP = 9;

function excluded(it: RawItem): boolean {
  if (!it.enabled || it.category?.enabled === false) return true;
  if (EXCLUDE_CATEGORIES.has(it.category.title)) return true;
  if (it.title.startsWith('리뷰 ') || EXCLUDE_TITLES.has(it.title)) return true;
  if (it.diningOptions && !it.diningOptions.includes('TOGO')) return true;
  return false;
}

function toChoice(c: RawChoice): MenuChoice {
  return {
    id: c.id,
    title: c.title,
    price: c.priceValue ?? 0,
    soldOut: c.state !== 'ON_SALE',
    qtyEnabled: !!c.quantityEnabled && c.maxQuantity > 1,
    maxQty: Math.min(c.maxQuantity || 1, MAX_QTY_CAP),
  };
}

function toGroup(o: RawOption): MenuOptionGroup {
  const choices = (o.choices ?? []).filter((c) => c.enabled).map(toChoice);
  const max = Math.max(1, Math.min(o.maxChoices || 1, choices.length || 1));
  return { id: o.id, title: o.title, required: !!o.required, min: o.required ? Math.max(1, o.minChoices) : 0, max, choices };
}

/** 카탈로그 → 손님용 메뉴. 순서는 카탈로그 그대로(카테고리 order → 상품 order). */
export function sanitizeCatalog(raw: RawItem[]): MenuCategory[] {
  const cats = new Map<string, { order: number; cat: MenuCategory }>();
  for (const it of raw.filter((r) => !excluded(r)).sort((a, b) => a.order - b.order)) {
    const price = it.price?.priceValue ?? 0;
    const item: MenuItem = {
      id: it.id,
      title: it.title,
      description: (it.description ?? '').trim(),
      price,
      imageUrl: it.imageUrl,
      soldOut: it.state !== 'ON_SALE',
      labels: it.labels ?? [],
      optionGroups: (it.options ?? []).filter((o) => o.enabled).map(toGroup).filter((g) => g.choices.length > 0),
    };
    const slot = cats.get(it.category.id) ?? { order: it.category.order, cat: { id: it.category.id, title: it.category.title, items: [] } };
    slot.cat.items.push(item);
    cats.set(it.category.id, slot);
  }
  return Array.from(cats.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => c.cat)
    // 전부 품절이거나, 판매 중인 건 사진 없는 곁들이뿐인 카테고리(예: 냉쫄면 여름시즌의 「빨간 소스」)는 숨긴다
    .filter((c) => c.items.some((i) => !i.soldOut && i.imageUrl));
}

export async function fetchMenu(): Promise<MenuCategory[]> {
  const raw = await tossplaceFetch<RawItem[]>('/catalog/items', { next: { revalidate: 60 } });
  return sanitizeCatalog(raw);
}

/** 주문 확정용 — 캐시 없이 지금 메뉴판 (품절 즉시 반영). 포스 주문의 itemPrice 를 위해 원본 가격 칸도 돌려준다 */
export async function fetchCatalogFresh(): Promise<{ menu: MenuCategory[]; priceMeta: Map<string, PosItemPrice> }> {
  const raw = await tossplaceFetch<RawItem[]>('/catalog/items', { cache: 'no-store' });
  const priceMeta = new Map<string, PosItemPrice>();
  for (const it of raw) {
    priceMeta.set(it.id, {
      title: it.price?.title ?? '기본',
      priceType: it.price?.priceType ?? 'FIXED',
      priceUnit: it.price?.priceUnit ?? 1,
      priceValue: it.price?.priceValue ?? 0,
      isTaxFree: false,
      taxInclusive: true,
    });
  }
  return { menu: sanitizeCatalog(raw), priceMeta };
}

/* ───────── 포스 주문 생성 ───────── */

export interface PosItemPrice {
  title: string;
  priceType: string;
  priceUnit: number;
  priceValue: number;
  isTaxFree: boolean;
  taxInclusive: boolean;
}

export interface PosOrderInput {
  /** 우리 주문 id — 토스 orderKey (같은 키 재전송은 토스가 거부 → 중복 주문 없음) */
  orderKey: string;
  orderNumber: string;
  lines: PricedLine[];
  listPrice: number;
  discountAmount: number;
  totalAmount: number;
  memo: string;
  /** 결제 승인 시각 ISO */
  approvedAt: string;
  /** 시험 모드: 메뉴판 상품 대신 「[테스트] 이름」 임의 상품으로 넣는다 */
  test: boolean;
  /** itemId → 메뉴판 가격 칸 (없으면 기본값) */
  priceMeta?: Map<string, PosItemPrice>;
}

const isoNoMs = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function buildPosOrderBody(input: PosOrderInput) {
  const lineItems = input.lines.map((l) => {
    const meta = input.priceMeta?.get(l.itemId);
    const itemPrice: PosItemPrice = {
      title: meta?.title ?? '기본',
      priceType: meta?.priceType ?? 'FIXED',
      priceUnit: meta?.priceUnit ?? 1,
      priceValue: l.basePrice,
      isTaxFree: false,
      taxInclusive: true,
    };
    const appliedDiscounts = l.discounts.map((d) => {
      const amount = d.amountPerUnit * l.qty;
      return { title: d.title, type: 'FIXED_AMOUNT', amount, percentage: 0, fixedAmount: amount };
    });
    const base = { diningOption: 'TOGO', itemPrice, quantity: l.qty, ...(appliedDiscounts.length ? { appliedDiscounts } : {}) };
    if (input.test) {
      // 시험 주문은 실매장 포스 매출에 잡히지 않게 금액을 전부 0원으로 넣는다(2026-11-18 15,500원 시험 주문이 매출로 잡힌 사고)
      return {
        diningOption: 'TOGO',
        itemPrice: { ...itemPrice, priceValue: 0 },
        quantity: l.qty,
        targetType: 'AD_HOC',
        item: { title: `[테스트] ${l.title} (${l.basePrice.toLocaleString('ko-KR')}원)`, code: 'TEST', category: { title: '테스트' } },
        optionChoices: l.choices.map((c) => ({ option: { title: c.optionTitle }, title: c.title, price: 0, quantity: c.qty })),
      };
    }
    return {
      ...base,
      targetType: 'ITEM',
      targetId: l.itemId,
      optionChoices: l.choices.map((c) => ({ optionId: c.optionId, optionChoiceId: c.choiceId, price: c.price, quantity: c.qty })),
    };
  });
  if (input.test) {
    const zero = { listPrice: 0, discountAmount: 0, tipAmount: 0, serviceChargeAmount: 0, taxAmount: 0, supplyAmount: 0, taxExemptAmount: 0, totalAmount: 0 };
    return {
      order: { orderKey: input.orderKey, orderNumber: input.orderNumber, lineItems, chargePrice: zero, memo: `${input.memo} (실제 금액 ${input.totalAmount.toLocaleString('ko-KR')}원)` },
      payments: [{ approvedAt: isoNoMs(input.approvedAt), amount: 0, taxAmount: 0, supplyAmount: 0, taxExemptAmount: 0, tipAmount: 0 }],
    };
  }
  const { taxAmount, supplyAmount } = splitVat(input.totalAmount);
  return {
    order: {
      orderKey: input.orderKey,
      orderNumber: input.orderNumber,
      lineItems,
      chargePrice: {
        listPrice: input.listPrice,
        discountAmount: -input.discountAmount,
        tipAmount: 0,
        serviceChargeAmount: 0,
        taxAmount,
        supplyAmount,
        taxExemptAmount: 0,
        totalAmount: input.totalAmount,
      },
      memo: input.memo,
    },
    payments: [
      {
        approvedAt: isoNoMs(input.approvedAt),
        amount: input.totalAmount,
        taxAmount,
        supplyAmount,
        taxExemptAmount: 0,
        tipAmount: 0,
      },
    ],
  };
}

export type PosCreateResult =
  | { ok: true; posOrderId: string; orderState: string | null }
  | { ok: false; retryable: boolean; status: number; error: string };

/** 한 번 보내기. 키는 로그·응답에 싣지 않는다 */
export async function postPosOrder(body: unknown): Promise<PosCreateResult> {
  const { accessKey, secret, merchantId } = credentials();
  let res: Response;
  try {
    res = await fetch(`${BASE}/merchants/${merchantId}/order/orders?printOrderSheet=true`, {
      method: 'POST',
      headers: { 'x-access-key': accessKey, 'x-secret-key': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return { ok: false, retryable: true, status: 0, error: `네트워크: ${e instanceof Error ? e.message : String(e)}` };
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 본문이 JSON 이 아님 */
  }
  if (res.ok && json?.resultType === 'SUCCESS' && json?.success?.id) {
    return { ok: true, posOrderId: String(json.success.id), orderState: json.success.orderState ?? null };
  }
  const reason = json?.error ? JSON.stringify(json.error).slice(0, 500) : text.slice(0, 500);
  return { ok: false, retryable: res.status >= 500 || res.status === 429, status: res.status, error: `HTTP ${res.status} ${reason}` };
}

/** 네트워크·5xx 는 최대 3번(1초·3초 쉬고) 다시. 4xx 는 바로 실패 */
export async function createPosOrderWithRetry(body: unknown, maxAttempts = 3): Promise<PosCreateResult & { attempts: number }> {
  let last: PosCreateResult = { ok: false, retryable: false, status: 0, error: '시도 안 함' };
  for (let i = 1; i <= maxAttempts; i++) {
    last = await postPosOrder(body);
    if (last.ok || !last.retryable) return { ...last, attempts: i };
    if (i < maxAttempts) await new Promise((r) => setTimeout(r, i === 1 ? 1000 : 3000));
  }
  return { ...last, attempts: maxAttempts };
}

export async function getPosOrder(posOrderId: string): Promise<any> {
  return tossplaceFetch<any>(`/order/orders/${encodeURIComponent(posOrderId)}`, { cache: 'no-store' });
}
