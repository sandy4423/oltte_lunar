/**
 * 캠페인 주문(떡국만두 등) 수령완료 문자 — 장부앱 문안의 **사본**
 *
 * ── 왜 사본인가 ───────────────────────────────────────────────────────────
 * 떡국만두 주문은 만두앱 `/admin` 과 장부앱 카운터 **두 화면**에서 다 처리된다.
 * 어느 쪽에서 눌러도 손님이 받는 문자가 같아야 한다. 두 앱은 배포가 달라
 * 코드를 공유할 수 없으므로, 문안을 여기에 그대로 옮겨 둔다.
 *
 * ⛔ 원본은 `oltte-bookkeeping` 의 `src/lib/sms.ts` → `createPickupDoneSMS` 다.
 *    **한쪽만 고치면 같은 캠페인 손님끼리 다른 문자를 받는다.** 고칠 일이 있으면
 *    반드시 양쪽을 같이 고쳐라.
 *
 * ── 원본과 일부러 다른 점 (그래서 문자는 같게 나온다) ─────────────────────
 * · 리뷰 이벤트 링크를 붙이지 않는다.
 *   장부앱 `lib/review/links.ts` 의 `REVIEW_PAGE_SLUGS` 가 `['fresh']` 하나뿐이라
 *   리뷰 화면 자체가 과일(fresh)에만 있다. 만두 매장 캠페인은 원본에서도 링크가
 *   붙지 않는다 (2026-09-22 실측: `review_events` 행도 fresh 하나뿐).
 *   ⚠️ 만두 캠페인에 리뷰 화면이 생기면 이 파일로는 링크를 못 붙인다. 그때는
 *      이 파일이 아니라 **장부앱 카운터에서 수령 처리**해야 한다.
 * · 가게 이름·수량 단위를 DB(`sale_campaigns.slug`)로 찾지 않고 아래 표에서 찾는다.
 *   표에 없는 캠페인은 **문자를 보내지 않는다** (아래 주석 참고).
 */

/** 카카오 단톡방 (장부앱 `lib/config.ts` 의 `OPENCHAT_URL` 과 같은 값) */
const OPENCHAT_URL = 'https://open.kakao.com/o/gzhh4i5h';

/**
 * 이 앱이 수령완료 문자를 보낼 수 있는 캠페인.
 *
 * ⛔ **모르는 캠페인은 여기에 없어야 한다.** 없으면 수령 처리(`picked_up_at`)는
 *    그대로 하되 문자를 보내지 않고, 화면이 사장님께 그 사실을 알린다.
 *    가게 이름(`[올때만두]`/`[올때빙수]`)이나 단위(팩/박스)를 추측해서 보내면
 *    손님이 엉뚱한 가게 이름의 문자를 받는다.
 * ⛔ 값은 장부앱 `lib/config.ts` 의 `CAMPAIGN_ROUTES` 와 같아야 한다
 *    (`campaignSmsBrand` = `[brand]`, `campaignQtyUnit` = `qtyUnit`).
 */
const CAMPAIGN_SMS: Record<string, { brand: string; qtyUnit: string }> = {
  // 떡국만두 (만두 1호점, 2026-09-22)
  tteokguk26: { brand: '[올때만두]', qtyUnit: '팩' },
};

export interface CampaignPickupLine {
  name: string;
  qty: number;
  /** 곁들임(포장용 보자기 등). 단위가 캠페인 단위가 아니라 언제나 「장」이다 */
  isAddon?: boolean;
}

/** 이 앱이 그 캠페인의 수령완료 문자를 보낼 수 있는가 */
export function canSendCampaignPickupSMS(slug: string | null | undefined): boolean {
  return !!slug && slug in CAMPAIGN_SMS;
}

/**
 * 주문 줄 만들기 — 장부앱 `lib/campaignItems.ts` 의 `linesFromOrderItems` 사본.
 *
 * 만두앱 조회는 `campaign_product:campaign_products(...)` 라는 별칭을 쓰므로
 * (`lib/orderItemName.ts` 의 `ORDER_ITEMS_SELECT`) 별칭·원래 이름 둘 다 받는다.
 */
export function campaignLinesFromOrderItems(orderItems: unknown): CampaignPickupLine[] {
  if (!Array.isArray(orderItems)) return [];
  return orderItems
    .map((it: any) => {
      const raw = it?.campaign_product ?? it?.campaign_products;
      const product = Array.isArray(raw) ? raw[0] : raw;
      const line: CampaignPickupLine = {
        name: String(product?.name ?? '').trim(),
        qty: Number(it?.qty ?? 0),
      };
      if (product?.is_addon === true) line.isAddon = true;
      return line;
    })
    .filter((l) => l.qty > 0 && l.name.length > 0);
}

/** 장부앱 `campaignItems.unitOf` 사본 */
function unitOf(line: CampaignPickupLine, setUnit: string): string {
  return line.isAddon === true ? '장' : setUnit;
}

/** 장부앱 `campaignItems.describeItems(lines, '주문 상품', ' · ', qtyUnit)` 사본 */
function describeItems(lines: CampaignPickupLine[], setUnit: string): string {
  if (lines.length === 0) return '주문 상품';
  return lines.map((l) => `${l.name} ${l.qty}${unitOf(l, setUnit)}`).join(' · ');
}

/**
 * 수령완료 문자 문안. 보낼 수 없는 캠페인이면 **null** —
 * 호출부는 문자를 건너뛰고 그 사실을 응답에 담는다.
 *
 * ⛔ 손님 이름은 `campaign_order_details.depositor_name` 이다. `customers.name` 이
 *    아니다 — 캠페인 주문의 `customers.name` 에는 한글이 아닌 값이 섞여 있다
 *    (장부앱 `createPickupNoticeSMS` 주석의 2026-09-21 실측).
 */
export function createCampaignPickupDoneSMS(params: {
  slug: string | null | undefined;
  depositorName: string | null | undefined;
  items: CampaignPickupLine[];
  /** 줄이 하나도 없을 때 쓸 수량 (장부앱과 같은 폴백) */
  totalQty?: number | null;
}): string | null {
  const { slug, depositorName, items, totalQty } = params;
  const conf = slug ? CAMPAIGN_SMS[slug] : undefined;
  if (!conf) return null;

  const lines = items.length > 0 ? items : [{ name: '주문 상품', qty: totalQty ?? 1 }];
  const itemsText = describeItems(lines, conf.qtyUnit);

  const invite = OPENCHAT_URL
    ? `

드셔보시고 맛있으셨다면 주변분들께
단톡방 입장을 소개 부탁드립니다 :)
${OPENCHAT_URL}`
    : '';

  return `${conf.brand} ${depositorName || '고객'}님, ${itemsText} 수령이 완료되었습니다.

이용해 주셔서 감사합니다.${invite}`;
}
