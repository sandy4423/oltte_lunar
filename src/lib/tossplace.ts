/**
 * 토스포스 오픈API (서버 전용 — 클라이언트 컴포넌트에서 import 금지).
 * 키는 환경변수에서만 읽고 어떤 응답에도 싣지 않는다.
 *   TOSSPLACE_OPENAPI_ACCESS_KEY / TOSSPLACE_OPENAPI_SECRET / TOSSPLACE_MERCHANT_ID
 */
import type { MenuCategory, MenuChoice, MenuItem, MenuOptionGroup, CartLine } from '@/lib/jache/types';

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
  price: { priceValue: number } | null;
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
const EXCLUDE_TITLES = new Set(['교자 2+1 행사', '쫄면 1+1']);
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

/* ───────── 2단계 자리: 포스 주문 생성 (아직 구현 안 함) ───────── */

export interface CreatePosOrderInput {
  /** 우리 주문 표의 주문번호 (중복 생성 방지 키) */
  orderRef: string;
  lines: CartLine[];
  /** 픽업 예정 시각 (ISO) */
  pickupAt: string;
  memo?: string;
  /** 외부결제로 기록할 금액 */
  paidAmount: number;
}

export interface CreatePosOrderResult {
  posOrderId: string;
}

export async function createPosOrder(_input: CreatePosOrderInput): Promise<CreatePosOrderResult> {
  throw new Error('createPosOrder: 2단계에서 구현');
}
