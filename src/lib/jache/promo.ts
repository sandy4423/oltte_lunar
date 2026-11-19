/**
 * 단톡방 전용 할인 주소 — www.olttefood.com/menu?d=dangol 로 들어온 손님에게만 기간 할인(PERCENT_RULES.code)을 준다.
 * 사장님 11-19 「단톡방에서 단골 손님들한테만 할인하는 링크」→「파라미터 붙여」.
 * 브라우저에 코드를 기억하고(주문서까지 이어지게), 서버는 주문 요청의 promo 값으로 다시 계산한다(브라우저 값으로 금액을 정하지 않는다 — 코드 이름만 받음).
 */
const KEY = 'jache-promo';

export function getClientPromo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** 주소에 ?d=… 가 있으면 기억한다 */
export function savePromoFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const d = new URL(window.location.href).searchParams.get('d');
    if (d && /^[a-z0-9]{2,20}$/i.test(d)) window.localStorage.setItem(KEY, d.toLowerCase());
  } catch {
    /* 무시 */
  }
}
