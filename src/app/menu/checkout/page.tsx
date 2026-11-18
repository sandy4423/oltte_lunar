'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import { useJacheCart } from '@/hooks/useJacheCart';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { Stepper } from '@/components/jache/ItemSheet';
import { choiceSummary, hhmm, kstNow, lineTotal, pickupState, won, type OpenState } from '@/lib/jache/cart';

const REQUESTS = ['단무지 빼기', '수저 빼기', '도착하면 전화'];
const PHONE_KEY = 'jache-phone-v1';

const fmtPhone = (d: string) => (d.length <= 3 ? d : d.length <= 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`);

export default function CheckoutPage() {
  const cart = useJacheCart();
  const v = usePhoneVerification();
  const [open, setOpen] = useState<OpenState | null>(null);
  const [pickup, setPickup] = useState<'now' | number | null>(null);
  const [reqs, setReqs] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);

  // 영업 상태는 30초마다 다시 계산
  useEffect(() => {
    const tick = () => setOpen(pickupState(kstNow()));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  // 아는 번호는 미리 채운다 (인증은 다시 받는다)
  useEffect(() => {
    try {
      const p = window.localStorage.getItem(PHONE_KEY);
      if (p && /^010\d{8}$/.test(p)) v.setPhone(p);
    } catch {
      /* 무시 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!v.isPhoneVerified) return;
    try {
      window.localStorage.setItem(PHONE_KEY, v.phone);
    } catch {
      /* 무시 */
    }
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

  const pickupLabel = useMemo(() => (pickup === 'now' ? '지금 바로' : typeof pickup === 'number' ? `오늘 ${hhmm(pickup)}` : ''), [pickup]);

  const onPhoneChange = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    v.setPhone(d.startsWith('010') ? d.slice(0, 11) : ('010' + d).slice(0, 11));
  };

  const empty = cart.hydrated && cart.lines.length === 0;
  const phoneOk = /^010\d{8}$/.test(v.phone);

  return (
    <main
      className="min-h-dvh bg-[#FBFAF7] pb-44 text-zinc-900"
      style={{ fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-xl px-5">
        <header className="flex items-center gap-2 pb-2 pt-6">
          <Link href="/menu" aria-label="메뉴로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-100">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">주문서</h1>
        </header>

        {empty ? (
          <div className="py-24 text-center">
            <p className="text-base font-medium text-zinc-700">담은 메뉴가 없어요</p>
            <Link href="/menu" className="mt-4 inline-flex h-12 items-center rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white">
              메뉴 보기
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* 주문 내역 */}
            <Card title="주문 내역">
              <ul className="divide-y divide-zinc-100">
                {cart.lines.map((l) => (
                  <li key={l.key} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold leading-snug">{l.title}</p>
                        {l.choices.length > 0 && <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{choiceSummary(l.choices)}</p>}
                      </div>
                      <button onClick={() => cart.remove(l.key)} aria-label={`${l.title} 빼기`} className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Stepper small value={l.qty} min={1} max={99} onChange={(q) => cart.setQty(l.key, q)} />
                      <span className="text-[15px] font-semibold tabular-nums">{won(lineTotal(l))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {open?.state === 'closedDay' && <ClosedCard text="오늘은 쉬는 날이에요" sub="수요일 09:00부터 주문할 수 있어요" />}
            {open?.state === 'ended' && <ClosedCard text="오늘 주문이 끝났어요" sub="내일 09:00부터 주문할 수 있어요" />}

            {open?.state === 'open' && (
              <>
                {/* 픽업 시간 */}
                <Card title="픽업 시간" hint="사거리 모서리, 파출소 대각선 맞은편">
                  <div className="flex flex-wrap gap-2">
                    {open.canNow && <Chip on={pickup === 'now'} onClick={() => setPickup('now')}>지금 바로(약 15분)</Chip>}
                  </div>
                  <div className={`grid max-h-[180px] grid-cols-4 gap-2 overflow-y-auto overscroll-contain p-0.5 -m-0.5 ${open.canNow ? 'mt-2' : ''}`}>
                    {open.slots.map((m) => (
                      <Chip key={m} on={pickup === m} onClick={() => setPickup(m)}>
                        {hhmm(m)}
                      </Chip>
                    ))}
                  </div>
                </Card>

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

                {/* 휴대폰 */}
                <Card title="휴대폰 번호">
                  {v.isPhoneVerified ? (
                    <p className="flex h-12 items-center gap-2 text-lg font-semibold tabular-nums">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      {fmtPhone(v.phone)}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
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
              </>
            )}
          </div>
        )}
      </div>

      {!empty && cart.hydrated && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-xl px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {open?.state === 'open' && (
              <p className="mb-2 flex justify-between text-[13px] text-zinc-500">
                <span className="tabular-nums">{v.phone ? fmtPhone(v.phone) : '휴대폰 번호 필요'}</span>
                <span>{pickupLabel} 픽업</span>
              </p>
            )}
            <button disabled className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand-dark px-5 text-base font-bold text-white opacity-40">
              <span>결제하기</span>
              <span className="tabular-nums">{won(cart.total)}</span>
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">결제는 준비 중</p>
          </div>
        </div>
      )}
    </main>
  );
}

function Card({ title, hint, optional, children }: { title: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-base font-bold">{title}</h2>
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
      }`}
    >
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
