/**
 * 행동 기록의 「화면 이름」 규칙 — 브라우저(수집기)와 서버(/api/menu/behavior)가 같이 쓴다 (2026-10-28).
 *
 * 주소에 든 토큰(주문·영수증·선택 링크 등)은 이름에 절대 남기지 않는다: 토큰처럼 보이는 조각은 `:token` 으로 가린다.
 * 쿼리(?…)와 해시(#…)는 처음부터 쓰지 않는다.
 */

// mandu(만두 주문앱) · psychart(psychart.kr): 다른 사이트 수집기가 meta.app 으로 보낸다 (2026-11-02).
// ⛔ 빌드업은 넣지 않는다 — 빌드업에서 올때 주소로 보내면 매장 운영 사실이 드러난다(규칙 2026-10-20). 빌드업은 자기 DB 로.
// 서버(/api/menu/behavior)는 여기 없는 앱 이름이면 meta.app 을 아예 버려 보고서에서 fresh 로 잘못 묶인다.
// 수집기가 없는 앱의 화면 이름 규칙(appOf)은 그대로다 — 이 세 값은 appOf 가 돌려주지 않고 밖에서 온 값만 통과시킨다.
export const BEHAVIOR_APPS = ['fresh', 'vote', 'staff', 'admin', 'operation', 'panel', 'books', 'other', 'mandu', 'psychart'] as const;
export type BehaviorApp = (typeof BEHAVIOR_APPS)[number];

/** 토큰처럼 생겼나: 16자 이상 [A-Za-z0-9_-] 이면서 숫자나 대소문자 섞임이 있거나 28자 이상. UUID 도 포함.
 *  (campaign-review-admin 같은 소문자 단어+하이픈 주소 조각은 토큰이 아니다) */
export function isTokenLikeSegment(seg: string): boolean {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(seg)) return false;
  if (seg.length >= 28) return true;
  return /\d/.test(seg) || (/[a-z]/.test(seg) && /[A-Z]/.test(seg));
}

/** 주소 경로 → 화면 이름. 토큰은 :token, 알파벳·숫자·_-. 밖의 글자(한글 등)가 든 조각은 :seg */
export function maskPathname(pathname: string): string {
  const segs = String(pathname || '/').split('?')[0].split('#')[0].split('/').filter(Boolean);
  const out = segs.map((s) => {
    if (!/^[A-Za-z0-9_\-.]+$/.test(s)) return ':seg';
    return isTokenLikeSegment(s) ? ':token' : s;
  });
  return ('/' + out.join('/')).slice(0, 80) || '/';
}

/** 서버가 받아들이는 화면 이름인가 */
export function isValidBehaviorPage(page: string): boolean {
  if (typeof page !== 'string' || !page.startsWith('/') || page.length > 80) return false;
  if (!/^[\/A-Za-z0-9_:\-.]+$/.test(page)) return false;
  return !page.split('/').some((s) => isTokenLikeSegment(s));
}

/** 호스트 + 경로 → 어느 앱의 화면인가 (경로는 브라우저 주소창 기준, rewrite 전) */
export function appOf(host: string, pathname: string): BehaviorApp {
  const p = pathname || '/';
  const under = (...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(x + '/'));
  if (under('/store-panel')) return 'panel';
  if (under('/campaign-operation', '/operation')) return 'operation';
  if (under('/campaign-admin', '/admin', '/campaign-stats', '/stats', '/campaign-review-admin', '/review-admin')) return 'admin';
  if (under('/fresh/vote')) return 'vote';
  if (under('/fresh', '/church', '/chuseok26', '/tteokguk26', '/jujube26', '/opinion', '/review')) return 'fresh';
  if (under('/staff', '/soldout', '/attendance')) return 'staff';
  if (under('/login', '/g', '/share')) return 'other';
  if (host.startsWith('staff.')) return 'staff';
  if (host.startsWith('fresh.')) return 'fresh';
  if (host.startsWith('gift.')) return 'other';
  return 'books';
}

/** 화면 이름에 :token 이 든 화면은 개인 링크다 — 누른 글자(이름 등)를 담지 않는다 */
export function pageIsPersonal(page: string): boolean {
  return page.includes(':token') || page.includes(':seg');
}
