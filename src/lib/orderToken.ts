/**
 * 주문 열쇠 (브라우저용)
 *
 * 주문을 만들면 서버가 열쇠(accessToken)를 준다. 주소의 t= 와 sessionStorage 에 같이 둔다.
 * (서버 쪽 검증은 src/lib/orderAccess.server.ts)
 */

const KEY_PREFIX = 'oltte_order_token_';

export function rememberOrderToken(orderId: number | string, token: string): void {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${orderId}`, token);
  } catch { /* 저장 불가 환경은 주소의 t= 로만 이어간다 */ }
}

export function getOrderToken(orderId: number | string | null | undefined): string | null {
  if (typeof window === 'undefined' || orderId === null || orderId === undefined) return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('t');
    if (fromUrl) return fromUrl;
  } catch { /* ignore */ }
  try {
    return sessionStorage.getItem(`${KEY_PREFIX}${orderId}`);
  } catch {
    return null;
  }
}
