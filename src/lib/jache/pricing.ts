/**
 * 서버 금액 계산 — 브라우저가 보낸 가격은 쓰지 않는다.
 * 받는 것: 상품 id·수량·선택지 id·선택지 수량. 값은 지금 토스포스 메뉴판(카탈로그) + discounts.ts 로 다시 계산한다.
 */
import type { MenuCategory, MenuItem } from './types';
import { discountsFor } from './discounts';
import { giftLine, giftStatus, type GiftItem } from './gift';

export interface PricedChoice {
  optionId: string;
  optionTitle: string;
  choiceId: string;
  title: string;
  price: number;
  qty: number;
}

export interface PricedLine {
  itemId: string;
  title: string;
  qty: number;
  basePrice: number;
  choices: PricedChoice[];
  /** 1개 정가 (기본가 + 선택지) */
  unitList: number;
  /** 1개당 할인 */
  unitDiscount: number;
  discounts: { title: string; amountPerUnit: number }[];
  lineList: number;
  lineDiscount: number;
  lineTotal: number;
  /** 증정 줄 (15,000원 이상 제로식혜) — 손님이 담은 게 아니라 서버가 붙인다 */
  gift?: boolean;
}

export interface PricedCart {
  lines: PricedLine[];
  listPrice: number;
  discountAmount: number;
  total: number;
}

const MAX_LINES = 30;
const MAX_LINE_QTY = 99;
const MAX_TOTAL = 500_000;

type Result = { ok: true; value: PricedCart } | { ok: false; error: string };

export function priceCart(rawLines: unknown, menu: MenuCategory[], promo: string | null = null, gift: GiftItem | null = null, now?: Date): Result {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return { ok: false, error: '담은 메뉴가 없어요' };
  if (rawLines.length > MAX_LINES) return { ok: false, error: '한 번에 담을 수 있는 메뉴가 너무 많아요' };

  const items = new Map<string, MenuItem>();
  for (const c of menu) for (const it of c.items) items.set(it.id, it);

  const lines: PricedLine[] = [];
  for (const raw of rawLines as any[]) {
    const item = items.get(String(raw?.itemId ?? ''));
    if (!item) return { ok: false, error: '지금 주문할 수 없는 메뉴가 있어요' };
    if (item.soldOut) return { ok: false, error: `${item.title} 품절이에요` };

    const qty = raw?.qty;
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) return { ok: false, error: '수량이 올바르지 않아요' };

    const rawChoices: any[] = Array.isArray(raw?.choices) ? raw.choices : [];
    const choices: PricedChoice[] = [];
    const seen = new Set<string>();
    for (const rc of rawChoices) {
      const group = item.optionGroups.find((g) => g.id === String(rc?.optionId ?? ''));
      const choice = group?.choices.find((c) => c.id === String(rc?.choiceId ?? ''));
      if (!group || !choice) return { ok: false, error: `${item.title} 옵션이 바뀌었어요. 다시 담아 주세요` };
      if (choice.soldOut) return { ok: false, error: `${choice.title} 품절이에요` };
      const key = `${group.id}:${choice.id}`;
      if (seen.has(key)) return { ok: false, error: '옵션이 올바르지 않아요' };
      seen.add(key);
      const cq = rc?.qty ?? 1;
      if (typeof cq !== 'number' || !Number.isInteger(cq) || cq < 1 || cq > (choice.qtyEnabled ? choice.maxQty : 1)) {
        return { ok: false, error: '옵션 수량이 올바르지 않아요' };
      }
      choices.push({ optionId: group.id, optionTitle: group.title, choiceId: choice.id, title: choice.title, price: choice.price, qty: cq });
    }
    for (const g of item.optionGroups) {
      const n = choices.filter((c) => c.optionId === g.id).length;
      if (n < g.min) return { ok: false, error: `${item.title}: ${g.title}을 골라 주세요` };
      if (n > g.max) return { ok: false, error: `${item.title}: ${g.title}은 ${g.max}개까지예요` };
    }

    const unitList = item.price + choices.reduce((s, c) => s + c.price * c.qty, 0);
    const ds = discountsFor({ itemId: item.id, title: item.title }, unitList, undefined, promo);
    const unitDiscount = Math.min(ds.reduce((s, d) => s + d.amountPerUnit, 0), unitList);
    lines.push({
      itemId: item.id,
      title: item.title,
      qty,
      basePrice: item.price,
      choices,
      unitList,
      unitDiscount,
      discounts: ds.map((d) => ({ title: d.title, amountPerUnit: d.amountPerUnit })),
      lineList: unitList * qty,
      lineDiscount: unitDiscount * qty,
      lineTotal: (unitList - unitDiscount) * qty,
    });
  }

  // 증정: 손님이 내는 음식값이 기준 이상이면 서버가 제로식혜 1개를 붙인다 (손님이 보낸 줄에 gift 표시가 있어도 위에서 일반 상품으로만 계산됨)
  if (giftStatus(lines.reduce((s, l) => s + l.lineTotal, 0), gift, now).eligible) lines.push(giftLine(gift!));

  const listPrice = lines.reduce((s, l) => s + l.lineList, 0);
  const discountAmount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const total = listPrice - discountAmount;
  if (total <= 0 || total > MAX_TOTAL) return { ok: false, error: '주문 금액이 올바르지 않아요' };
  return { ok: true, value: { lines, listPrice, discountAmount, total } };
}

/** 부가세 포함 금액 → 세액·공급가 (10%) */
export function splitVat(total: number): { taxAmount: number; supplyAmount: number } {
  const taxAmount = Math.round(total / 11);
  return { taxAmount, supplyAmount: total - taxAmount };
}

/** 결제창에 보일 주문 이름 */
export function orderName(lines: PricedLine[]): string {
  lines = lines.filter((l) => !l.gift);
  const first = lines[0]?.title ?? '만두';
  const rest = lines.reduce((s, l) => s + l.qty, 0) - (lines[0]?.qty ?? 0);
  const n = `올때만두 ${first}${rest > 0 ? ` 외 ${rest}개` : ''}`;
  return n.length > 90 ? n.slice(0, 90) : n;
}
