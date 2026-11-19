// 앱 이름은 'mandu' 로 고정

/**
 * 손님 판매 화면 행동 기록 — 헛클릭·연타·꺼진 버튼·막힘·칸 포기·화면 오류 (2026-10-24).
 *
 * 사장님 2026-10-24: 「모든 헛클릭을 기록하고 바로 분석할수있게도 해」.
 * 모아서 5초마다(또는 화면을 떠날 때) `/api/menu/behavior` 로 한 번에 보낸다.
 * 받는 쪽이 이벤트 이름·길이를 다시 거르므로 여기서는 모으고 보내기만 한다.
 *
 * ⚠️ campaign-track.ts 와 같은 약속을 지킨다
 * 1. **절대 await 하지 않는다.** 주문 흐름을 기다리게 하지 않는다.
 * 2. **절대 throw 하지 않는다.** 기록이 안 남는 것보다 주문이 막히는 쪽이 비교할 수 없이 나쁘다.
 * ⛔ 입력칸에 친 값(이름·전화·주소)은 어떤 경우에도 담지 않는다. 칸 이름(id)만.
 * ⛔ 주문 토큰이 든 주소는 page 로 보내지 않는다 — 고정 문자열('/fresh')만.
 */

/** 같은 기기 표시. 「더 사고 싶어요」(WantMore)와 같은 값을 써서 두 기록을 이을 수 있게 한다 */
const VISITOR_KEY = 'oltte.wantmore.client.v1';
const SESSION_KEY = 'oltte.behavior.session.v1';
/** 한 탭에서 보낼 최대 개수. 고장 난 화면이 끝없이 쏟아내지 않게 */
const MAX_PER_SESSION = 1000; // 2026-11-10 정상 클릭·카드 보기까지 담으며 400 → 1000
const FLUSH_MS = 5000;

export interface BehaviorEvent {
  event: string;
  target?: string;
  x?: number;
  y?: number;
  meta?: Record<string, string | number | boolean | null>;
  /** 클라이언트 시각(ms) — 서버가 묶음 안 순서를 맞추는 데만 쓴다 */
  t: number;
  /** 넣을 때의 주문서 걸음 — 보낼 때가 아니라 그 순간 값이어야 한다 */
  s?: number;
}

let page = '';
let app = '';
/** 판매 화면 수집기(BehaviorTracker)가 떠 있는 개수 — 전 화면 수집기는 이 동안 조용히 있는다 */
let pageTrackers = 0;
let step = 0;
let visitor = '';
let session = '';
let queue: BehaviorEvent[] = [];
let sent = 0;
let timer: number | null = null;
/** 사장님 기기 표시(?notrack=1, campaign-track.ts 와 같은 저장 키) — 켜져 있으면 아무것도 보내지 않는다 */
let noTrack = false;
const NOTRACK_KEY = 'oltte_notrack';

function readNoTrack(): boolean {
  try {
    const v = new URLSearchParams(window.location.search).get('notrack');
    const ls = safeStorage('local');
    if (v === '1') { try { ls?.setItem(NOTRACK_KEY, '1'); } catch { /* 무시 */ } return true; }
    if (v === '0') { try { ls?.removeItem(NOTRACK_KEY); } catch { /* 무시 */ } return false; }
    return ls?.getItem(NOTRACK_KEY) === '1';
  } catch {
    return false;
  }
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  }
}

function readId(storage: Storage | null, key: string): string {
  try {
    const saved = storage?.getItem(key);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
  } catch { /* 저장소 막힘 */ }
  const id = randomId();
  try { storage?.setItem(key, id); } catch { /* 무시 */ }
  return id;
}

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** 화면이 뜰 때 한 번. 같은 탭에서 다시 불러도 id 는 그대로다 */
export function registerPageTracker(): () => void {
  pageTrackers++;
  let done = false;
  return () => { if (!done) { done = true; pageTrackers = Math.max(0, pageTrackers - 1); } };
}
export function isPageTrackerActive(): boolean {
  return pageTrackers > 0;
}

export function behaviorInit(pageName: string): void {
  try {
    if (typeof window === 'undefined') return;
    page = pageName;
    app = 'mandu'; // 만두 주문앱 고정 (보고서에서 앱별로 가름)
    // 사장님이 확인차 여는 화면이 손님 통계에 섞이지 않게 (2026-11-10: 이 표시가 행동 기록엔 안 먹고 있었다)
    noTrack = readNoTrack();
    if (!visitor) visitor = readId(safeStorage('local'), VISITOR_KEY);
    if (!session) session = readId(safeStorage('session'), SESSION_KEY);
  } catch { /* 무시 */ }
}

/** 지금 주문서가 몇 걸음째인지 — 모든 기록에 붙는다 */
export function behaviorStep(n: number): void {
  step = n;
}

/** 기록 하나 넣기. 던지고 잊는다 */
export function behaviorPush(e: Omit<BehaviorEvent, 't'>): void {
  try {
    if (typeof window === 'undefined' || !page || !visitor || noTrack) return;
    if (sent + queue.length >= MAX_PER_SESSION) return;
    queue.push({ ...e, t: Date.now(), s: step });
    if (queue.length >= 40) behaviorFlush();
    else if (timer === null) timer = window.setTimeout(() => behaviorFlush(), FLUSH_MS);
  } catch { /* 무시 */ }
}

/** 모은 것을 보낸다. 화면을 떠날 때도 sendBeacon 이라 끝까지 간다 */
export function behaviorFlush(): void {
  try {
    if (timer !== null) { window.clearTimeout(timer); timer = null; }
    if (!queue.length) return;
    const events = queue.splice(0, 50);
    sent += events.length;
    const body = JSON.stringify({
      page, step, visitor, session, app,
      vw: window.innerWidth, vh: window.innerHeight,
      events,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/menu/behavior', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/menu/behavior', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
      }).catch(() => {});
    }
    if (queue.length) behaviorFlush();
  } catch { /* 무시 */ }
}

/** 누른 곳을 사람이 읽을 수 있게 짧게 적는다. ⛔ 입력칸이면 값 말고 id/이름만 */
export function describeTarget(el: Element | null, withText = true): string {
  try {
    if (!el) return '';
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    let base = cls ? `${tag}.${cls}` : tag;
    // 사진은 class 가 없어 「img」 하나로 뭉친다 — 어느 사진(큰 사진·목록 썸네일·묶음)인지 감싼 칸 class 와
    // alt(상품명, 우리 화면 글)를 붙인다 (2026-10-26 사진 헛클릭 5명이 어느 사진인지 몰라서)
    if (el instanceof HTMLImageElement) {
      const wrap = (typeof el.parentElement?.className === 'string' ? el.parentElement.className : '')
        .split(/\s+/).filter(Boolean)[0];
      if (wrap) base += `<${wrap}>`;
      const alt = !withText ? '' : (el.alt || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      return (alt ? `${base}|${alt}` : base).slice(0, 80);
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const name = el.id || el.getAttribute('name') || '';
      const type = el instanceof HTMLInputElement ? el.type : tag;
      return `${base}#${name}[${type}]`.slice(0, 80);
    }
    const tracked = el.closest('[data-track]')?.getAttribute('data-track');
    if (tracked) base += `@${tracked}`;
    // 글자는 우리 화면 글(상품명·버튼 글자)이다. 입력칸 값은 textContent 에 안 들어온다.
    // ⛔ 팝업 안은 글자를 안 담는다 — 입금자명 확인 창이 손님 이름을 글자로 보여 준다
    if (el.closest('[role="dialog"],[role="alertdialog"],[aria-modal="true"],[data-no-text]')) return base.slice(0, 80);
    // 수량 ＋/－ 는 글자가 기호뿐이라 어느 상품인지 모른다 — 우리가 단 aria-label(「상품명 수량 줄이기」)을 쓴다
    // (2026-10-28 꺼진 「－」 9명 15회가 어느 상품인지 몰라서)
    if (!withText) return base.slice(0, 80);
    const aria = el.tagName === 'BUTTON' ? (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim() : '';
    if (aria) return `${base}|${(el.textContent || '').trim().slice(0, 4)}|${aria.slice(0, 40)}`.slice(0, 80);
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return (text ? `${base}|${text}` : base).slice(0, 80);
  } catch {
    return '';
  }
}
