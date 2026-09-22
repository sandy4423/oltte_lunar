/**
 * 주문 상품 이름 — 한 곳에서만 계산한다
 *
 * 주문 한 줄(order_items)의 상품에는 두 가지 종류가 있습니다.
 *
 *  1) 만두앱 자체 상품 — `sku` 에 코드가 들어 있고, 이름은 constants.ts 의
 *     PRODUCTS 목록에 있습니다. (시원 만두전골, 칼국수 …)
 *  2) 캠페인 상품 — `sku` 가 비어 있고(NULL), 이름은 DB 의 campaign_products
 *     테이블에 있습니다. (떡국용만두 고기 한팩 …)
 *
 * 예전에는 화면·문자·슬랙·라벨 등 12곳이 저마다 `getProductBySku(item.sku)` 를
 * 불러서 이름을 만들었습니다. 캠페인 상품은 sku 가 비어 있어서 그 12곳 전부가
 * 이름 자리를 빈칸으로 찍었습니다(화면에 "x1 x1", 문자에는 빈칸).
 *
 * 그래서 이름 계산을 이 파일 하나로 모았습니다. 새로 이름을 보여줄 곳이 생기면
 * 여기 함수를 부르면 되고, 규칙이 바뀌어도 여기만 고치면 됩니다.
 *
 * 주의 — 캠페인 이름이 나오려면 조회 쿼리가 campaign_products 를 함께 읽어야
 * 합니다. 그렇지 않으면 아래 함수는 안전하게 대체 이름으로 내려갑니다.
 *   .select('*, order_items(*, campaign_product:campaign_products(id, name), ...)')
 */

import { getProductBySku } from '@/lib/constants';

/** PostgREST 가 상황에 따라 객체 또는 배열로 내려주는 임베드 값 */
type Embedded<T> = T | T[] | null | undefined;

/** 이름을 뽑을 수 있는 주문 한 줄. 필요한 필드만 느슨하게 요구한다 */
export interface NameableOrderItem {
  sku?: string | null;
  campaign_product_id?: string | null;
  campaign_product?: Embedded<{ id?: string | null; name?: string | null }>;
  campaign_product_option_id?: string | null;
  campaign_product_option?: Embedded<{ id?: string | null; label?: string | null }>;
}

/** 이름을 끝내 못 찾았을 때 쓸 말 — 빈칸보다는 낫다 */
const UNKNOWN_NAME = '상품';
/** 캠페인 상품인 건 아는데 이름만 못 읽었을 때 */
const UNKNOWN_CAMPAIGN_NAME = '캠페인 상품';

function first<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * 상품 이름 (이모지 없음). 문자·슬랙·라벨처럼 글자만 필요한 곳에서 쓴다.
 */
export function getOrderItemName(item: NameableOrderItem | null | undefined): string {
  if (!item) return UNKNOWN_NAME;

  // 1) 캠페인 상품이 먼저 — sku 가 비어 있는 주문이다
  const campaignProduct = first(item.campaign_product);
  if (campaignProduct?.name) {
    const option = first(item.campaign_product_option);
    return option?.label ? `${campaignProduct.name} (${option.label})` : campaignProduct.name;
  }

  // 2) 만두앱 자체 상품
  if (item.sku) {
    const product = getProductBySku(item.sku);
    if (product) return product.name;
    return item.sku; // 목록에 없는 옛 sku — 코드라도 보여 준다
  }

  // 3) 캠페인 상품인 건 아는데 이름을 함께 읽지 않은 경우
  if (item.campaign_product_id) return UNKNOWN_CAMPAIGN_NAME;

  return UNKNOWN_NAME;
}

/**
 * 상품 이모지. 캠페인 상품은 이모지가 없으므로 fallback 을 돌려준다.
 * (기본값 '' — 화면에서는 이모지 없이 이름만 나온다)
 */
export function getOrderItemEmoji(
  item: NameableOrderItem | null | undefined,
  fallback = ''
): string {
  if (item?.sku) {
    const product = getProductBySku(item.sku);
    if (product?.emoji) return product.emoji;
  }
  return fallback;
}

/**
 * 화면 표시용 "이모지 이름". 이모지가 없으면 이름만 나온다.
 */
export function getOrderItemLabel(item: NameableOrderItem | null | undefined): string {
  const emoji = getOrderItemEmoji(item);
  const name = getOrderItemName(item);
  return emoji ? `${emoji} ${name}` : name;
}

/**
 * 집계용 키. 같은 상품끼리 묶을 때 쓴다.
 * 캠페인 상품은 sku 가 전부 NULL 이라 sku 로 묶으면 서로 다른 상품이
 * "null" 한 덩어리로 합쳐져 버린다(실제로 '상품별 준비 수량'에 그런 줄이 있었다).
 */
export function getOrderItemKey(item: NameableOrderItem | null | undefined): string {
  if (!item) return 'unknown';
  if (item.campaign_product_id) {
    return item.campaign_product_option_id
      ? `cp:${item.campaign_product_id}:${item.campaign_product_option_id}`
      : `cp:${item.campaign_product_id}`;
  }
  if (item.sku) return item.sku;
  return 'unknown';
}

/**
 * 조회 쿼리에서 쓸 order_items 선택 문구.
 *
 * 캠페인 상품 이름은 다른 표(campaign_products)에 있어서 함께 읽어야 나옵니다.
 * 이름을 보여 주는 화면·문자·슬랙이 쓰는 쿼리는 전부 이 상수를 쓰세요.
 * (문자열을 여기저기 적어 두면 한 곳만 빠뜨려도 그 화면만 빈칸이 됩니다)
 */
export const ORDER_ITEMS_SELECT =
  'order_items(*, campaign_product:campaign_products(id, name), campaign_product_option:campaign_product_options(id, label))';

/**
 * order_items 표를 직접 조회할 때 쓸 선택 문구 (위 상수의 안쪽만 떼어낸 것).
 */
export const ORDER_ITEM_COLUMNS_SELECT =
  '*, campaign_product:campaign_products(id, name), campaign_product_option:campaign_product_options(id, label)';
