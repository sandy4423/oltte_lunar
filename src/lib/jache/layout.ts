/**
 * 자체앱(/menu) 전용 카테고리 배치 — 포스·키오스크 카테고리는 그대로 두고 자체앱 화면에서만 다시 나눈다.
 * 사장님 2026-11-19 「자체 앱에서는 카테고리 분류를 새롭게 해서 새로 배치해. 우리 마케팅 전략에 맞게 배치해.」
 *
 * 근거 (store-automation docs/marketing/2026-11-12-브랜드-전략.md, 최근 30일 매장·픽업 판매 tosspos_order_items):
 *  - 세트: 한 문장 「만두엔 쫄면」 = 세트 자체. 겨울 대표는 쫄우동 세트(전략 ②), 쫄면세트는 매출 1위 상품
 *  - 쫄우동·쫄면: 겨울 신메뉴 쫄우동을 단품 맨 앞에, 송도쫄면 검색 1위인 쫄면이 다음
 *  - 교자: 판매량 순(고기 453 · 김치 304 · 특새우 150 · 갈비 97 · 불 52)
 *  - 왕만두: 반죽부터 직접 빚는 메뉴, 리뷰 이벤트 보상도 왕만두
 *  - 만두전골·떡국: 「집에서 끓여 먹는 포장 전골」 두 번째 축 + 곁들이·떡국용
 *
 * 규칙: 한 상품은 한 칸에만(장바구니 수량 표시가 헷갈리지 않게). 이름에 할인·가격 문구 넣지 않음.
 * 배치에 없는 새 상품은 빠지지 않게 ① 원래 카테고리에 맞는 칸 맨 뒤, ② 그것도 없으면 맨 아래에 원래 카테고리 이름으로 붙는다.
 */
import type { MenuCategory, MenuItem } from '@/lib/jache/types';

interface Slot {
  /** 토스 상품 id — 이름이 바뀌어도 그대로 따라간다 */
  id: string;
  /** id 가 바뀌었을 때(삭제 후 재등록) 이름으로 다시 찾는다 */
  title: string;
}

interface LayoutCategory {
  /** 화면 칩 이동(cat-${id})에 쓰는 안정적인 문자열 */
  id: string;
  title: string;
  items: Slot[];
}

export const JACHE_LAYOUT: LayoutCategory[] = [
  {
    id: 'set',
    title: '세트',
    items: [
      { id: '18744444', title: '쫄우동 세트' },
      { id: '10054200', title: '쫄면세트 (1인 강력추천)' },
      { id: '18784689', title: '송도 불쫄면 세트 (1인)' },
    ],
  },
  {
    id: 'noodle',
    title: '쫄우동·쫄면',
    items: [
      { id: '18741353', title: '쫄우동' },
      { id: '9498996', title: '올때 쫄면' },
      { id: '18784650', title: '송도 불쫄면' },
    ],
  },
  {
    id: 'gyoza',
    title: '교자',
    items: [
      { id: '18175589', title: '교자 고기' },
      { id: '8721301', title: '교자 김치' },
      { id: '9405956', title: '[하루20판한정] 특새우만두' },
      { id: '11220366', title: '갈비만두' },
      { id: '8721283', title: '[매운만두] 불만두' },
    ],
  },
  {
    id: 'wang',
    title: '왕만두',
    items: [
      { id: '8721306', title: '왕 고기' },
      { id: '8721322', title: '왕 찐빵' },
      { id: '8721311', title: '왕 김치' },
    ],
  },
  {
    id: 'jeongol',
    title: '만두전골·떡국',
    items: [
      { id: '9499024', title: '시원 만두전골 (비조리)' },
      { id: '9499086', title: '얼큰 만두전골 (비조리)' },
      { id: '10539749', title: '전골만두 추가 (8알)' },
      { id: '9825038', title: '칼국수사리' },
      { id: '10015916', title: '양지육수 (1200ml)' },
      { id: '9860852', title: '떡국용 만두 (반반)' },
      { id: '9860830', title: '떡국용 만두 (고기)' },
      { id: '9860840', title: '떡국용 만두 (김치)' },
      { id: '10758839', title: '[장모님의] 떡국떡 1kg' },
    ],
  },
  {
    id: 'drink',
    title: '음료',
    items: [
      { id: '8721334', title: '제로식혜 뚱캔' },
      { id: '11416954', title: '코카콜라 뚱캔' },
      { id: '11416945', title: '제로콜라 뚱캔' },
      { id: '11416958', title: '사이다' },
    ],
  },
];

/** 배치에 없는 새 상품이 원래 어느 토스 카테고리에 있었는지로 붙일 칸 (토스 카테고리 id → 자체앱 칸 id) */
const FALLBACK_BY_TOSS_CATEGORY: Record<string, string> = {
  '1767066': 'noodle', // 쫄우동
  '970067': 'jeongol', // 떡국용 & 사리
  '1094410': 'drink', // 음료
};

/** 사진 있는 판매 중 상품이 하나도 없는 칸은 숨긴다 (sanitizeCatalog 와 같은 기준) */
function visible(c: MenuCategory): boolean {
  return c.items.some((i) => !i.soldOut && i.imageUrl);
}

/** sanitizeCatalog 결과(토스 카테고리) → 자체앱 배치. 숨김·품절 상태는 건드리지 않는다 */
export function applyJacheLayout(menu: MenuCategory[]): MenuCategory[] {
  const byId = new Map<string, number>();
  const byTitle = new Map<string, number>();
  JACHE_LAYOUT.forEach((cat, ci) =>
    cat.items.forEach((s, si) => {
      const key = ci * 1000 + si;
      byId.set(s.id, key);
      byTitle.set(s.title, key);
    }),
  );

  const placed: { key: number; item: MenuItem }[][] = JACHE_LAYOUT.map(() => []);
  const extras = new Map<string, MenuCategory>(); // 맨 아래로 가는 새 상품 (원래 카테고리 이름 그대로)
  const seen = new Set<string>();

  for (const cat of menu) {
    cat.items.forEach((item, idx) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      const key = byId.get(item.id) ?? byTitle.get(item.title);
      if (key !== undefined) {
        placed[Math.floor(key / 1000)].push({ key, item });
        return;
      }
      const fallback = JACHE_LAYOUT.findIndex((c) => c.id === FALLBACK_BY_TOSS_CATEGORY[cat.id]);
      if (fallback >= 0) {
        placed[fallback].push({ key: fallback * 1000 + 900 + idx, item });
        return;
      }
      const extra = extras.get(cat.id) ?? { id: `etc-${cat.id}`, title: cat.title, items: [] };
      extra.items.push(item);
      extras.set(cat.id, extra);
    });
  }

  const laid: MenuCategory[] = JACHE_LAYOUT.map((cat, ci) => ({
    id: cat.id,
    title: cat.title,
    items: placed[ci].sort((a, b) => a.key - b.key).map((p) => p.item),
  }));
  return laid.concat(Array.from(extras.values())).filter(visible);
}
