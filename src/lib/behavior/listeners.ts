import {
  behaviorFlush, behaviorInit, behaviorPush, describeTarget, isPageTrackerActive,
} from '@/lib/behavior/behavior';

/**
 * 헛클릭 수집 리스너 모음 (2026-10-28 전 화면 확대 때 BehaviorTracker 에서 그대로 꺼냈다).
 * 판매 화면(BehaviorTracker)은 모든 옵션을 켜고, 전 화면 수집기(GlobalBehaviorTracker)는 헛클릭 계열만 켠다.
 * ⛔ 입력칸의 값은 어디에도 담지 않는다. 리스너 안에서 throw 하지 않는다.
 */
const INTERACTIVE =
  'a,button,input,select,textarea,label,summary,[role="button"],[role="radio"],[role="checkbox"],[role="tab"],[tabindex]:not([tabindex="-1"]),[data-track]';

export interface ListenerOptions {
  page: string;
  /** 누른 요소의 글자(상품명·버튼 글자)를 target 에 담을지. 개인정보가 보일 수 있는 화면은 false */
  text: boolean;
  /** field_empty_leave */ fields: boolean;
  /** error_shown */ alerts: boolean;
  /** leave 이벤트 (끄면 화면을 떠날 때 보내기만 한다) */ leave: boolean;
  /** 전 화면 수집기면 true — 판매 화면 수집기가 떠 있는 동안은 아무것도 기록하지 않는다 */
  passive?: boolean;
  /**
   * 깊은 기록 (2026-11-10 사장님 「기록 깊게 많이해」) — 판매 화면에만 켠다.
   * ctx(들어온 경로) · tap(정상 클릭) · scroll_depth · card_seen · card_dwell · return
   */
  deep?: boolean;
}

/** 상품 카드(모양 4가지)와 그 안의 이름·값 자리 — OrderForm 의 class 이름 */
const CARD_SEL = '.product-block,.product-row,.menu-board-row,.bundle-card,[data-bh-card]';
const CARD_NAME_SEL = '.product-name,.menu-board-name,.bundle-card-title';
const CARD_PRICE_SEL = '.price.tnum,.bundle-card-price';

function cardInfo(card: Element): { name: string; price: number | null; out: boolean } {
  const name = (card.querySelector(CARD_NAME_SEL)?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const priceText = card.querySelector(CARD_PRICE_SEL)?.textContent || '';
  const digits = priceText.replace(/[^0-9]/g, '');
  const price = digits ? Math.min(Number(digits.slice(0, 7)), 9_999_999) : null;
  const out = card.classList.contains('has-restock-cover') || card.classList.contains('is-out');
  return { name, price, out };
}

/** 들어온 경로 — 기기 원문은 담지 않고 짧은 갈래만 */
function contextMeta(): Record<string, string | number | null> {
  const ua = (navigator.userAgent || '').toLowerCase();
  const inapp = /kakaotalk/.test(ua) ? 'kakao' : /naver\(inapp|naver/.test(ua) ? 'naver'
    : /instagram/.test(ua) ? 'insta' : /fban|fbav/.test(ua) ? 'fb' : /band/.test(ua) ? 'band'
    : /line\//.test(ua) ? 'line' : 'none';
  const os = /iphone|ipad|ipod/.test(ua) ? 'ios' : /android/.test(ua) ? 'android' : /windows|macintosh/.test(ua) ? 'pc' : 'other';
  let ref = 'none';
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname;
      ref = h === location.hostname ? 'self' : h.slice(0, 40);
    }
  } catch { /* 무시 */ }
  // 이 기기로 이 화면에 몇 번째 들어왔나 (탭마다 한 번 셈)
  let visits: number | null = null;
  try {
    const k = 'oltte.behavior.visits.v1';
    const sk = 'oltte.behavior.counted.v1';
    const n = Number(localStorage.getItem(k) || '0') || 0;
    if (!sessionStorage.getItem(sk)) {
      localStorage.setItem(k, String(n + 1));
      sessionStorage.setItem(sk, '1');
      visits = n + 1;
    } else visits = n;
  } catch { /* 무시 */ }
  let src: string | null = null;
  try { src = new URLSearchParams(location.search).get('source'); } catch { /* 무시 */ }
  return { inapp, os, ref, visits, hour: new Date().getHours(), source: src ? src.slice(0, 12) : null };
}

/*
  폰의 사진 고르기 창·공유 창처럼 「브라우저 밖」 창이 열리면 화면(DOM)은 안 바뀌어도 정상 반응이다.
  (2026-11-04: 소금빵 보상 「사진 추가」 9명 11회·쿠폰 「카톡으로 보내기」 3명 7회가 「반응 없음」으로 잘못 잡힘 —
  누른 사람 대부분이 사진을 붙여 접수를 마쳤다)
  사진 칸(input[type=file])이 눌리거나 navigator.share 가 불리면 그 시각을 적어 두고, 그 클릭은 「반응 없음」으로 세지 않는다.
*/
let nativeUiAt = 0;
function hookNativeShare() {
  try {
    const n = navigator as Navigator & { __behaviorShareHooked?: boolean };
    if (typeof n.share !== 'function' || n.__behaviorShareHooked) return;
    const orig = n.share.bind(n);
    n.share = (data?: ShareData) => {
      nativeUiAt = Date.now();
      return orig(data);
    };
    n.__behaviorShareHooked = true;
  } catch { /* 무시 */ }
}

export function startBehaviorListeners(opts: ListenerOptions): () => void {
  hookNativeShare();
  const suppressed = () => !!opts.passive && isPageTrackerActive();
  behaviorInit(opts.page);
  const startedAt = Date.now();
  let maxScroll = 0;
  const clicks: { x: number; y: number; t: number }[] = [];
  let lastRage = 0;
  const focusAt = new Map<Element, number>();
  const secNow = () => Math.round((Date.now() - startedAt) / 1000);
  const depthDone = new Set<number>();

  const onScroll = () => {
    try {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) maxScroll = Math.max(maxScroll, Math.round((window.scrollY / h) * 100));
      if (opts.deep && !suppressed()) {
        for (const d of [25, 50, 75, 100]) {
          if (maxScroll >= (d === 100 ? 98 : d) && !depthDone.has(d)) {
            depthDone.add(d);
            behaviorPush({ event: 'scroll_depth', target: String(d), meta: { sec: secNow() } });
          }
        }
      }
    } catch { /* 무시 */ }
  };

  // 카드 보기: 60% 이상 보인 채 0.8초 → card_seen(한 번), 보인 시간 합 → 떠날 때 card_dwell
  const cardVisibleSince = new Map<Element, number>();
  const cardMs = new Map<string, number>();
  const cardSeen = new Set<string>();
  const cardTimers = new Map<Element, number>();
  const observed = new WeakSet<Element>();
  let io: IntersectionObserver | null = null;
  const closeCard = (el: Element, now: number) => {
    const since = cardVisibleSince.get(el);
    if (since === undefined) return;
    cardVisibleSince.delete(el);
    const { name } = cardInfo(el);
    if (name) cardMs.set(name, (cardMs.get(name) ?? 0) + (now - since));
  };
  if (opts.deep && typeof IntersectionObserver !== 'undefined') {
    try {
      io = new IntersectionObserver((entries) => {
        try {
          const now = Date.now();
          for (const en of entries) {
            const el = en.target;
            if (en.isIntersecting && en.intersectionRatio >= 0.6) {
              if (!cardVisibleSince.has(el)) cardVisibleSince.set(el, now);
              if (!cardTimers.has(el)) {
                cardTimers.set(el, window.setTimeout(() => {
                  try {
                    cardTimers.delete(el);
                    if (!cardVisibleSince.has(el) || suppressed()) return;
                    const info = cardInfo(el);
                    if (!info.name || cardSeen.has(info.name)) return;
                    cardSeen.add(info.name);
                    behaviorPush({ event: 'card_seen', target: info.name, meta: { price: info.price, out: info.out, sec: secNow(), n: cardSeen.size } });
                  } catch { /* 무시 */ }
                }, 800));
              }
            } else {
              const t = cardTimers.get(el);
              if (t !== undefined) { window.clearTimeout(t); cardTimers.delete(el); }
              closeCard(el, now);
            }
          }
        } catch { /* 무시 */ }
      }, { threshold: [0, 0.6] });
    } catch { io = null; }
  }
  const scanCards = () => {
    try {
      if (!io) return;
      document.querySelectorAll(CARD_SEL).forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        io!.observe(el);
      });
    } catch { /* 무시 */ }
  };
  let scanTimer: number | null = null;
  const cardMo = new MutationObserver(() => {
    if (scanTimer !== null) return;
    scanTimer = window.setTimeout(() => { scanTimer = null; scanCards(); }, 500);
  });
  if (io) {
    scanCards();
    cardMo.observe(document.body, { subtree: true, childList: true });
  }
  const flushCardDwell = () => {
    try {
      const now = Date.now();
      Array.from(cardVisibleSince.keys()).forEach((el) => {
        closeCard(el, now);
        cardVisibleSince.set(el, now); // 돌아오면 이어서 잰다
      });
      Array.from(cardMs.entries()).forEach(([name, ms]) => {
        if (ms >= 1000) behaviorPush({ event: 'card_dwell', target: name, meta: { ms: Math.min(ms, 3_600_000) } });
      });
      cardMs.clear();
    } catch { /* 무시 */ }
  };

  if (opts.deep && !suppressed()) {
    try { behaviorPush({ event: 'ctx', meta: contextMeta() }); } catch { /* 무시 */ }
  }

  const onClick = (ev: MouseEvent) => {
    try {
      if (suppressed()) return;
      const el = ev.target instanceof Element ? ev.target : null;
      if (!el) return;
      const now = Date.now();
      // 숨긴 사진 칸을 버튼이 대신 누른 것(fileRef.click()) — 사진 고르기 창이 열린다. 연타 계산에도 넣지 않는다
      if (el.matches('input[type="file"]')) { nativeUiAt = now; return; }
      const x = Math.round(ev.clientX);
      const y = Math.round(ev.clientY);

      // 연타: 0.8초 안, 30px 안에서 3번째부터 한 번만
      clicks.push({ x, y, t: now });
      while (clicks.length && now - clicks[0].t > 800) clicks.shift();
      const near = clicks.filter((c) => Math.abs(c.x - x) < 30 && Math.abs(c.y - y) < 30);
      if (near.length >= 3 && now - lastRage > 1500) {
        lastRage = now;
        behaviorPush({ event: 'rage_click', target: describeTarget(el, opts.text), x, y, meta: { n: near.length } });
      }

      const hit = el.closest(INTERACTIVE);
      if (!hit) {
        behaviorPush({ event: 'dead_click', target: describeTarget(el, opts.text), x, y });
        return;
      }
      // (진짜 disabled 는 click 이 안 와서 onPointerDown 이 맡는다. 여기는 aria-disabled 같은 「꺼진 척」)
      const disabled =
        (hit as HTMLButtonElement).disabled === true || hit.getAttribute('aria-disabled') === 'true';
      if (disabled) {
        behaviorPush({ event: 'disabled_click', target: describeTarget(hit, opts.text), x, y });
        return;
      }
      // 정상 클릭도 남긴다 — 한 사람이 어떤 순서로 무엇을 눌렀나 (입력칸은 칸 이름만, 값 없음)
      if (opts.deep) {
        const card = hit.closest(CARD_SEL);
        behaviorPush({
          event: 'tap', target: describeTarget(hit, opts.text), x, y,
          meta: { sec: secNow(), card: card ? cardInfo(card).name || null : null },
        });
      }
      // 입력칸·라벨은 누르면 키보드가 뜰 뿐 화면이 안 바뀌는 게 정상이라 「효과 없음」을 재지 않는다
      if (hit.matches('input,textarea,select,label') || hit.closest('label')) return;
      // 새 탭으로 여는 링크(현금영수증 「발급 내역 확인하기 →」 등)는 이 화면이 안 바뀌는 게 정상이다
      // (2026-10-30: 발급 완료 화면의 그 링크가 8명 10회 「반응 없음」으로 잘못 잡힘 — 전원 발급 완료 상태)
      if (hit.matches('a[target="_blank"],a[download]')) return;

      // 버튼·링크: 0.8초 동안 화면(DOM)·주소가 하나도 안 바뀌면 「눌렀는데 아무 일 없음」
      const href = location.href;
      // 화면을 움직이기만 하는 버튼(품절 덮개의 「위 ○○ 외」 → 그 카드로 스크롤)은 DOM 이 안 바뀐다.
      // 스크롤 위치도 효과로 본다 (2026-10-25: 그 버튼이 「눌렀는데 안 바뀜」으로 2명 잘못 잡힘)
      const sy = window.scrollY;
      let changed = false;
      const mo = new MutationObserver(() => { changed = true; });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      window.setTimeout(() => {
        try {
          mo.disconnect();
          const nativeUi = nativeUiAt >= now || document.visibilityState === 'hidden';
          if (!changed && !nativeUi && location.href === href && Math.abs(window.scrollY - sy) < 20) {
            behaviorPush({ event: 'no_effect_click', target: describeTarget(hit, opts.text), x, y });
          }
        } catch { /* 무시 */ }
      }, 800);
    } catch { /* 무시 */ }
  };

  /*
    꺼진 버튼은 브라우저가 click 을 아예 안 보낸다 → 손가락이 닿는 순간(pointerdown)에 그 자리의
    맨 위 요소를 직접 본다. 꺼진 버튼이면 disabled_click 하나.
  */
  const onPointerDown = (ev: PointerEvent) => {
    try {
      if (suppressed()) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const btn = el?.closest('button,input,select,textarea');
      if (btn && (btn as HTMLButtonElement).disabled) {
        behaviorPush({ event: 'disabled_click', target: describeTarget(btn, opts.text), x: Math.round(ev.clientX), y: Math.round(ev.clientY) });
      }
    } catch { /* 무시 */ }
  };

  const onFocusIn = (ev: FocusEvent) => {
    if (!opts.fields) return;
    const el = ev.target;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) focusAt.set(el, Date.now());
  };
  const onFocusOut = (ev: FocusEvent) => {
    try {
      if (!opts.fields) return;
      const el = ev.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return;
      const since = focusAt.get(el);
      focusAt.delete(el);
      if (!el.value.trim()) {
        behaviorPush({
          event: 'field_empty_leave',
          target: describeTarget(el, opts.text),
          meta: { ms: since ? Date.now() - since : null },
        });
      }
    } catch { /* 무시 */ }
  };

  // 빨간 안내가 새로 뜨면 그 문구를 남긴다 (우리 화면 글이다. 팝업 안이면 글자 없이)
  const seenAlerts = new WeakSet<Element>();
  const alertMo = new MutationObserver(() => {
    try {
      document.querySelectorAll('[role="alert"]').forEach((a) => {
        if (seenAlerts.has(a)) return;
        seenAlerts.add(a);
        const text = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (!text) return;
        const inDialog = !!a.closest('[role="dialog"],[role="alertdialog"],[aria-modal="true"]');
        behaviorPush({ event: 'error_shown', target: inDialog ? 'dialog-alert' : text });
      });
    } catch { /* 무시 */ }
  });
  if (opts.alerts) alertMo.observe(document.body, { subtree: true, childList: true });

  const onError = (ev: ErrorEvent) => {
    if (suppressed()) return;
    behaviorPush({ event: 'js_error', target: String(ev.message || '').slice(0, 80) });
  };
  const onRejection = (ev: PromiseRejectionEvent) => {
    if (suppressed()) return;
    const r = ev.reason;
    behaviorPush({ event: 'js_error', target: String(r instanceof Error ? r.message : r).slice(0, 80) });
  };

  let leftAt = 0;
  let hiddenAt = 0;
  const leave = () => {
    try {
      // visibilitychange(hidden) 와 pagehide 가 같이 오면 한 번만
      if (Date.now() - leftAt < 1500) return;
      leftAt = Date.now();
      hiddenAt = leftAt;
      if (opts.deep && !suppressed()) flushCardDwell();
      if (opts.leave) {
        behaviorPush({
          event: 'leave',
          meta: { scroll: maxScroll, sec: Math.round((Date.now() - startedAt) / 1000) },
        });
      }
      behaviorFlush();
    } catch { /* 무시 */ }
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') { leave(); return; }
    // 다른 앱(카톡 등)에 갔다가 돌아옴
    try {
      if (opts.deep && hiddenAt && !suppressed()) {
        behaviorPush({ event: 'return', meta: { away: Math.round((Date.now() - hiddenAt) / 1000), sec: secNow() } });
      }
      hiddenAt = 0;
    } catch { /* 무시 */ }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', leave);

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', leave);
    alertMo.disconnect();
    cardMo.disconnect();
    try { io?.disconnect(); } catch { /* 무시 */ }
    cardTimers.forEach((t) => window.clearTimeout(t));
    if (scanTimer !== null) window.clearTimeout(scanTimer);
    behaviorFlush();
  };
}
