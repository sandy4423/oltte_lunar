import type { CartChoice, CartLine } from './types';
import { unitDiscountFor } from './discounts';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function lineKey(itemId: string, choices: CartChoice[]): string {
  const sig = [...choices]
    .sort((a, b) => a.choiceId.localeCompare(b.choiceId))
    .map((c) => `${c.choiceId}x${c.qty}`)
    .join(',');
  return `${itemId}|${sig}`;
}

/** 1개 정가 = 기본가 + 선택지 합 (포스 표시가) */
export function unitPrice(line: Pick<CartLine, 'basePrice' | 'choices'>): number {
  return line.basePrice + line.choices.reduce((s, c) => s + c.price * c.qty, 0);
}

/** 1개당 할인 (정가를 넘지 않게) — 규칙은 discounts.ts */
export function unitDiscount(line: Pick<CartLine, 'itemId' | 'title' | 'basePrice' | 'choices'>): number {
  return Math.min(unitDiscountFor(line, unitPrice(line)), unitPrice(line));
}

/** 손님이 내는 1개 값 */
export const unitPay = (line: Pick<CartLine, 'itemId' | 'title' | 'basePrice' | 'choices'>) => unitPrice(line) - unitDiscount(line);

export const lineListTotal = (line: CartLine) => unitPrice(line) * line.qty;
export const lineTotal = (line: CartLine) => unitPay(line) * line.qty;
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

/** 요청 칩 (서버도 이 목록만 받는다) */
export const REQUESTS = ['단무지 없어도 돼요', '젓가락 필요 없어요'] as const; // 손님 말투로 (사장님 11-19 「단무지 빼기가 아니라 … 젓가락 필요 없어요. 이렇게」). 「도착하면 전화」는 뺌

export function choiceSummary(choices: CartChoice[]): string {
  return choices.map((c) => (c.qty > 1 ? `${c.title} ${c.qty}` : c.title)).join(' · ');
}

/* ───────── 영업 시간 (한국 시각) ───────── */

export const OPEN_MIN = 9 * 60;
export const CLOSE_MIN = 21 * 60;
export const PREP_MIN = 15;

export interface KstNow {
  /** 0=일 … 2=화 */
  weekday: number;
  minutes: number;
}

export function kstNow(date = new Date()): KstNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday: wd, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export type OpenState =
  | { state: 'closedDay' }
  | { state: 'ended' }
  | { state: 'open'; canNow: boolean; opensAt: number; slots: number[] };

/** 오늘 주문 가능 상태 + 15분 간격 픽업 시간 (마지막 20:45) */
export function pickupState(now: KstNow): OpenState {
  if (now.weekday === 2) return { state: 'closedDay' };
  const earliest = Math.max(OPEN_MIN, Math.ceil((now.minutes + PREP_MIN) / 15) * 15);
  const slots: number[] = [];
  for (let m = earliest; m < CLOSE_MIN; m += 15) slots.push(m);
  if (slots.length === 0) return { state: 'ended' };
  const canNow = now.minutes >= OPEN_MIN && now.minutes + PREP_MIN < CLOSE_MIN;
  return { state: 'open', canNow, opensAt: OPEN_MIN, slots };
}
