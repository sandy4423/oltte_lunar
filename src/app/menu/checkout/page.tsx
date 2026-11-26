'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, Trash2 } from 'lucide-react';
import { useJacheCart } from '@/hooks/useJacheCart';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { Stepper } from '@/components/jache/ItemSheet';
import { REQUESTS, choiceSummary, hhmm, kstNow, lineListTotal, lineTotal, pickupState, won, type OpenState } from '@/lib/jache/cart';
import { Price } from '@/components/jache/Price';
import { useJacheFlags } from '@/components/jache/JacheFlags';
import { getClientPromo } from '@/lib/jache/promo';
import { discountTitles } from '@/lib/jache/discounts';
import { GiftMeter } from '@/components/jache/GiftMeter';
import { useJacheGift } from '@/hooks/useJacheGift';
import { GIFT_LABEL, giftStatus } from '@/lib/jache/gift';

const PHONE_KEY = 'jache-phone-v1';

const fmtPhone = (d: string) => (d.length <= 3 ? d : d.length <= 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`);

export default function CheckoutPage() {
  const cart = useJacheCart();
  const v = usePhoneVerification();
  const gift = useJacheGift();
  const giftOn = giftStatus(cart.total, gift);
  const [open, setOpen] = useState<OpenState | null>(null);
  const [pickup, setPickup] = useState<'now' | number | null>(null);
  // 픽업 — 기본은 「바로 픽업」(0), 「나중에 픽업」을 누르면 10·15·20분 뒤 (사장님 11-20 「기본은 항상 바로 픽업. 나중에픽업 버튼 눌러서 10분 15분 20분 버튼 따로 띄워」)
  const [afterMin, setAfterMin] = useState<0 | 10 | 15 | 20>(0);
  const [reqs, setReqs] = useState<string[]>([]);
  // 두 단계: ① 담은 것 확인 → ② 번호·결제 (사장님 11-19 「목록 먼저 뜨고 확인한 다음에 그 다음에 전화번호」)
  const [step, setStep] = useState<'review' | 'phone'>('review');
  // 2단계를 브라우저 기록 한 칸으로 — 폰 뒤로 가기가 메뉴가 아니라 1단계로 (11-19 점검)
  const goPhone = () => {
    setStep('phone');
    try {
      window.history.pushState({ jacheStep: 'phone' }, '', '/menu/checkout?step=phone');
    } catch {
      /* 무시 */
    }
    window.scrollTo({ top: 0 });
  };
  const backToReview = () => {
    if (typeof window !== 'undefined' && window.history.state?.jacheStep === 'phone') window.history.back();
    else {
      setStep('review');
      try {
        window.history.replaceState(null, '', '/menu/checkout');
      } catch {
        /* 무시 */
      }
    }
  };
  useEffect(() => {
    const onPop = () => setStep(new URLSearchParams(window.location.search).get('step') === 'phone' ? 'phone' : 'review');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [kakao, setKakao] = useState(false);
  // 카카오는 됐는데 번호를 못 받은 상태 — 버튼 대신 「연결됨」을 보여 주고 번호 한 번만 받는다
  const [kakaoLinked, setKakaoLinked] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const flags = useJacheFlags();
  const phoneRef = useRef<HTMLElement>(null);

  // 영업 상태는 30초마다 다시 계산
  useEffect(() => {
    const tick = () => setOpen(pickupState(kstNow()));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  // 아는 번호는 미리 채운다. 인증 쿠키(30분)가 살아 있으면 인증된 상태로 바로 둔다 — 결제 실패·취소로 돌아와도 다시 인증 안 함
  useEffect(() => {
    // 카카오 로그인에서 돌아오면 2단계로 연다
    try {
      if (new URLSearchParams(window.location.search).get('step') === 'phone') setStep('phone');
    } catch {
      /* 무시 */
    }
    try {
      const p = window.localStorage.getItem(PHONE_KEY);
      if (p && /^010\d{8}$/.test(p)) v.setPhone(p);
    } catch {
      /* 무시 */
    }
    fetch('/api/menu/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.kakao) setKakao(true);
        if (j?.kakaoLinked) setKakaoLinked(true);
        if (j?.phone && /^010\d{8}$/.test(j.phone)) {
          v.setPhone(j.phone);
          v.setIsPhoneVerified(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!v.isPhoneVerified) return;
    try {
      window.localStorage.setItem(PHONE_KEY, v.phone);
    } catch {
      /* 무시 */
    }
    // 카카오로 들어온 손님이면 이 번호를 카카오 계정에 바로 묶는다(서버가 처리)
    fetch('/api/menu/session', { credentials: 'same-origin', cache: 'no-store' }).catch(() => {});
  }, [v.isPhoneVerified, v.phone]);

  // 기본 선택: 바로 가능하면 지금 바로, 아니면 첫 시간
  useEffect(() => {
    if (!open || open.state !== 'open') return;
    setPickup((cur) => {
      if (cur === 'now' && open.canNow) return cur;
      if (typeof cur === 'number' && open.slots.includes(cur)) return cur;
      return open.canNow ? 'now' : open.slots[0];
    });
  }, [open]);

  const pickupLabel = useMemo(() => (pickup === 'now' ? (afterMin === 0 ? '바로' : `${afterMin}분 뒤`) : typeof pickup === 'number' ? `오늘 ${hhmm(pickup)}` : ''), [pickup, afterMin]);

  const onPhoneChange = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    v.setPhone(d.startsWith('010') ? d.slice(0, 11) : ('010' + d).slice(0, 11));
  };

  const empty = cart.hydrated && cart.lines.length === 0;
  const startKakao = async () => {
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { flowType: 'pkce', storageKey: 'jache-kakao-auth', detectSessionInUrl: false },
      });
      const { error } = await sb.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: `${window.location.origin}/menu/kakao/callback` } });
      if (error) setKakao(false); // 설정이 안 된 상태면 버튼을 거두고 문자 인증으로
    } catch {
      setKakao(false);
    }
  };
  const phoneOk = /^010\d{8}$/.test(v.phone);
  const listTotal = cart.lines.reduce((s, l) => s + lineListTotal(l), 0);
  const ready = open?.state === 'open' && pickup !== null && v.isPhoneVerified && agree;

  const pay = async () => {
    setPayError(null);
    if (!ready) {
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPayError(!v.isPhoneVerified ? '휴대폰 인증이 필요해요' : !agree ? '약관 동의가 필요해요' : '픽업 시간을 골라 주세요');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/menu/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          lines: cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, choices: l.choices.map((c) => ({ optionId: c.optionId, choiceId: c.choiceId, qty: c.qty })) })),
          pickup: pickup === 'now' ? `m${afterMin}` : hhmm(pickup as number),
          requests: reqs,
          promo: getClientPromo(),
          agree: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || '주문을 만들지 못했어요');
      const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
      if (d.simulate) {
        // 시험 모드(시험 비밀 키 없음): 결제창 없이 승인 흉내
        window.location.href = `/menu/pay/success?${q({ orderId: d.orderId, paymentKey: `SIM_${d.orderId}`, amount: String(d.amount), t: d.token })}`;
        return;
      }
      const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      const toss = await loadTossPayments(d.clientKey);
      await toss.requestPayment('카드', {
        amount: d.amount,
        orderId: d.orderId,
        orderName: d.orderName,
        successUrl: `${window.location.origin}/menu/pay/success?${q({ t: d.token })}`,
        failUrl: `${window.location.origin}/menu/pay/fail`,
      });
    } catch (e: any) {
      setPayError(e?.code === 'USER_CANCEL' ? null : e?.message || '결제를 시작하지 못했어요');
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-dvh bg-[#FBFAF7] pb-44 text-zinc-900"
      style={{ fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-xl px-5">
        <header className="flex items-center gap-2 pb-2 pt-6">
          {step === 'phone' ? (
            <button onClick={backToReview} aria-label="주문 내역으로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-100">
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <Link href="/menu" aria-label="메뉴로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-100">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          )}
          <h1 className="text-xl font-extrabold tracking-tight">{step === 'review' ? '주문 확인' : '휴대폰 번호'}</h1>
          {flags.test && <span className="ml-auto rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">시험</span>}
        </header>
        {/* 지금 어느 단계인지: 두 칸 막대, 지금 칸만 브랜드색 */}
        {!empty && (
          <div className="mb-3 grid grid-cols-2 gap-1.5" aria-label="주문 단계">
            {(['주문 확인', '번호·결제'] as const).map((t, i) => {
              const on = (step === 'review' ? 0 : 1) >= i;
              return (
                <div key={t}>
                  <div className={`h-1.5 rounded-full ${on ? 'bg-brand-dark' : 'bg-zinc-200'}`} />
                  <p className={`mt-1.5 text-xs ${(step === 'review' ? 0 : 1) === i ? 'font-bold text-brand-dark' : 'font-medium text-zinc-400'}`}>{t}</p>
                </div>
              );
            })}
          </div>
        )}

        {empty ? (
          <div className="py-24 text-center">
            <p className="text-base font-medium text-zinc-700">담은 메뉴가 없어요</p>
            <Link href="/menu" className="mt-4 inline-flex h-12 items-center rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white">
              메뉴 보기
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {step === 'review' && (<>
            {/* 주문 내역 */}
            <Card title="주문 내역">
              <ul className="divide-y divide-zinc-100">
                {cart.lines.map((l) => (
                  <li key={l.key} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-snug text-zinc-900">{l.title}</p>
                        {l.choices.length > 0 && <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{choiceSummary(l.choices)}</p>}
                      </div>
                      <button onClick={() => cart.remove(l.key)} aria-label={`${l.title} 빼기`} className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Stepper small value={l.qty} min={1} max={99} onChange={(q) => cart.setQty(l.key, q)} />
                      <Price className="text-base font-bold text-zinc-900" align="end" pay={lineTotal(l)} list={lineListTotal(l)} labels={discountTitles(l, lineListTotal(l) / l.qty)} />
                    </div>
                  </li>
                ))}
                {giftOn.eligible && gift && (
                  <li className="flex items-start justify-between gap-3 py-3.5 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug text-zinc-900">{gift.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">1개</p>
                    </div>
                    <Price className="text-base font-bold text-zinc-900" align="end" pay={0} list={gift.price} labels={[GIFT_LABEL]} />
                  </li>
                )}
              </ul>
              <GiftMeter payTotal={cart.total} gift={gift} className="mt-4 rounded-xl bg-[#FBFAF7] px-3 py-2.5" />
              {/* 합계: 할인은 브랜드색, 합계는 가장 크게 */}
              <div className="mt-4 space-y-1 border-t border-dashed border-zinc-200 pt-3">
                {listTotal > cart.total && (
                  <p className="flex justify-between text-sm font-semibold text-brand-dark">
                    <span>할인</span>
                    <span className="tabular-nums">-{won(listTotal - cart.total)}</span>
                  </p>
                )}
                <p className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-zinc-600">합계</span>
                  <span className="text-xl font-extrabold tabular-nums text-zinc-900">{won(cart.total)}</span>
                </p>
              </div>
            </Card>
            </>)}

            {open?.state === 'closedDay' && <ClosedCard text="오늘은 쉬는 날이에요" sub="수요일 09:00부터 주문할 수 있어요" />}
            {open?.state === 'ended' && <ClosedCard text="오늘 주문이 끝났어요" sub="내일 09:00부터 주문할 수 있어요" />}

            {open?.state === 'open' && (
              <>
                {step === 'review' && (<>
                {/* 픽업 — 기본 바로 픽업, 나중에 픽업 → 10·15·20분 뒤 (사장님 11-20) */}
                <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white">
                      <Clock className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-extrabold text-zinc-900">{pickup === 'now' ? (afterMin === 0 ? '바로 픽업' : `${afterMin}분 뒤 픽업 · ${hhmm(kstNow().minutes + afterMin)}쯤`) : typeof pickup === 'number' ? `오늘 ${hhmm(pickup)} 픽업` : ''}</p>
                      <p className="mt-0.5 text-[13px] font-medium text-zinc-600">사거리 모서리, 파출소 대각선 맞은편</p>
                    </div>
                  </div>
                  {pickup === 'now' && (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {([['바로 픽업', true], ['나중에 픽업', false]] as const).map(([label, isNow]) => {
                          const on = isNow ? afterMin === 0 : afterMin !== 0;
                          const laterOk = kstNow().minutes + 10 < 21 * 60;
                          return (
                            <button
                              key={label}
                              onClick={() => setAfterMin(isNow ? 0 : afterMin || 10)}
                              disabled={!isNow && !laterOk}
                              aria-pressed={on}
                              className={`h-12 rounded-xl text-[15px] font-bold transition active:scale-[0.97] ${on ? 'bg-brand-dark text-white' : 'bg-white text-zinc-700 ring-1 ring-orange-200'} disabled:opacity-30`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {afterMin !== 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {([10, 15, 20] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setAfterMin(m)}
                              disabled={kstNow().minutes + m >= 21 * 60}
                              aria-pressed={afterMin === m}
                              className={`h-11 rounded-xl text-sm font-bold tabular-nums transition active:scale-[0.97] ${afterMin === m ? 'bg-orange-500 text-white' : 'bg-white text-zinc-700 ring-1 ring-orange-200'} disabled:opacity-30`}
                            >
                              {m}분 뒤
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* 요청 */}
                <Card title="요청" optional>
                  <div className="flex flex-wrap gap-2">
                    {REQUESTS.map((r) => (
                      <Chip key={r} on={reqs.includes(r)} onClick={() => setReqs((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </Card>
                </>)}

                {step === 'phone' && (<>
                {/* 앞 단계 요약 — 누르면 고치러 돌아감 */}
                <button onClick={backToReview} className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 text-left active:bg-zinc-50">
                  <span className="min-w-0">
                    {cart.lines.map((l) => (
                      <span key={l.key} className="block text-[15px] font-bold leading-snug">
                        {l.title} <span className="text-zinc-500">×{l.qty}</span>
                        {l.choices.length > 0 && <span className="block text-[13px] font-medium text-zinc-500">{choiceSummary(l.choices)}</span>}
                      </span>
                    ))}
                    {giftOn.eligible && gift && (
                      <span className="block text-[15px] font-bold leading-snug">
                        {gift.title} <span className="text-zinc-500">×1</span> <span className="text-[13px] font-semibold text-green-700">증정</span>
                      </span>
                    )}
                    <span className="mt-0.5 block text-[13px] text-zinc-500">{pickupLabel} 픽업{reqs.length ? ` · ${reqs.join(' · ')}` : ''}</span>
                  </span>
                  <span className="ml-3 shrink-0 text-sm font-semibold text-brand-dark">바꾸기</span>
                </button>
                {/* 휴대폰 */}
                <Card title="휴대폰 번호" innerRef={phoneRef}>
                  {v.isPhoneVerified ? (
                    <p className="flex h-12 items-center gap-2 text-lg font-semibold tabular-nums">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <span data-no-text>{fmtPhone(v.phone)}</span>
                      <button
                        onClick={async () => {
                          await fetch('/api/menu/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
                          try {
                            window.localStorage.removeItem(PHONE_KEY);
                          } catch {
                            /* 무시 */
                          }
                          v.resetVerification();
                        }}
                        className="ml-auto h-10 rounded-xl px-3 text-sm font-semibold text-brand-dark active:bg-orange-50"
                      >
                        번호 바꾸기
                      </button>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {kakao && kakaoLinked && (
                        <p className="flex h-10 items-center gap-2 text-sm font-semibold text-zinc-700">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FEE500] text-[#191919]">
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </span>
                          카카오 연결됨 · 번호 한 번만 확인해요
                        </p>
                      )}
                      {kakao && !kakaoLinked && !v.verificationSent && (
                        <button
                          onClick={startKakao}
                          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191919] active:brightness-95"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.87 5.37 4.68 6.8-.2.74-.74 2.67-.85 3.08-.13.5.18.5.38.36.16-.1 2.5-1.7 3.5-2.4.74.1 1.5.16 2.29.16 5.52 0 10-3.58 10-8S17.52 3 12 3z" /></svg>
                          카카오로 계속하기
                        </button>
                      )}
                      {/* 카카오가 기본 (사장님 11-19 「카톡 로그인을 기본으로」). 번호 칸은 카카오 연결 직후(번호 한 번 묶기)나 「번호로 주문」을 눌렀을 때만 */}
                      {kakao && !kakaoLinked && !showPhone && !v.verificationSent ? (
                        <button onClick={() => setShowPhone(true)} className="h-12 w-full rounded-2xl bg-white text-sm font-bold text-zinc-700 ring-1 ring-zinc-300 active:bg-zinc-50">
                          번호로 주문
                        </button>
                      ) : (
                      <>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          autoFocus
                          placeholder="010-1234-5678"
                          value={v.phone ? fmtPhone(v.phone) : ''}
                          onChange={(e) => onPhoneChange(e.target.value)}
                          disabled={v.verificationSent}
                          className="h-14 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 text-lg font-semibold tabular-nums outline-none focus:border-brand-dark focus:ring-2 focus:ring-orange-200 disabled:bg-zinc-50"
                        />
                        {!v.verificationSent && (
                          <button
                            onClick={v.handleSendVerification}
                            disabled={!phoneOk || v.isSending}
                            className="h-14 shrink-0 rounded-2xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-30"
                          >
                            {v.isSending ? '보내는 중' : '인증번호 받기'}
                          </button>
                        )}
                      </div>
                      {v.verificationSent && (
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            placeholder="인증번호 6자리"
                            value={v.verificationCode}
                            onChange={(e) => {
                              const c = e.target.value.replace(/\D/g, '').slice(0, 6);
                              v.setVerificationCode(c);
                              if (c.length === 6) v.handleVerifyCode(c);
                            }}
                            className="h-14 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 text-lg font-semibold tracking-[0.3em] tabular-nums outline-none focus:border-brand-dark focus:ring-2 focus:ring-orange-200"
                          />
                          <button
                            onClick={() => v.handleVerifyCode()}
                            disabled={v.verificationCode.length !== 6 || v.isVerifying}
                            className="h-14 shrink-0 rounded-2xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-30"
                          >
                            {v.isVerifying ? '확인 중' : '확인'}
                          </button>
                        </div>
                      )}
                      {v.error && <p className="text-sm font-medium text-red-600">{v.error}</p>}
                      </>
                      )}
                    </div>
                  )}
                  {v.isPhoneVerified && (
                    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-[#CC590C]" />
                      <span className="flex-1">
                        이용약관·개인정보 수집 동의 <span className="text-zinc-400">(필수)</span>
                      </span>
                      <a href="/terms" target="_blank" rel="noreferrer" className="text-zinc-500 underline">
                        보기
                      </a>
                    </label>
                  )}
                </Card>
                </>)}
              </>
            )}
          </div>
        )}
      </div>

      {!empty && cart.hydrated && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-xl px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {step === 'review' ? (
              <button
                onClick={goPhone}
                disabled={open?.state !== 'open'}
                className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand-dark px-5 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                <span>이대로 주문</span>
                <Price pay={cart.total} list={listTotal} className="[&_s]:text-white/60" />
              </button>
            ) : (
              <>
                {open?.state === 'open' && (
                  <p className="mb-2 flex justify-between text-[13px] text-zinc-500">
                    <span className="tabular-nums" data-no-text>{v.phone ? fmtPhone(v.phone) : '휴대폰 번호 필요'}</span>
                    <span>{pickupLabel} 픽업</span>
                  </p>
                )}
                {payError && <p className="mb-2 text-center text-sm font-semibold text-red-600">{payError}</p>}
                <button
                  onClick={pay}
                  disabled={!flags.pay || busy || open?.state !== 'open'}
                  className={`flex h-14 w-full items-center justify-between rounded-2xl bg-brand-dark px-5 text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-40 ${
                    ready ? '' : 'opacity-60'
                  }`}
                >
                  <span>{busy ? '결제 여는 중' : '결제하기'}</span>
                  <Price pay={cart.total} list={listTotal} className="[&_s]:text-white/60" />
                </button>
              </>
            )}
            {!flags.pay && <p className="mt-2 text-center text-xs text-zinc-500">결제는 준비 중</p>}
          </div>
        </div>
      )}
    </main>
  );
}

function Card({ title, hint, optional, innerRef, children }: { title: string; hint?: string; optional?: boolean; innerRef?: React.Ref<HTMLElement>; children: React.ReactNode }) {
  return (
    <section ref={innerRef} className="scroll-mt-24 rounded-2xl border border-zinc-200/80 bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold text-zinc-500">{title}</h2>
        {optional && <span className="text-xs text-zinc-400">선택</span>}
        {hint && <span className="ml-auto text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-12 rounded-xl px-3.5 text-sm font-semibold tabular-nums transition active:scale-[0.97] ${
        on ? 'bg-brand-dark text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-300'
      } inline-flex items-center gap-1.5`}
    >
      {on && <Check className="h-4 w-4" strokeWidth={3} />}
      {children}
    </button>
  );
}

function ClosedCard({ text, sub }: { text: string; sub: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-center">
      <p className="text-lg font-bold">{text}</p>
      <p className="mt-1 text-sm text-zinc-500">{sub}</p>
    </section>
  );
}
