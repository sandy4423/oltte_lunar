'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useJacheCart } from '@/hooks/useJacheCart';

const FONT = { fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' };

function Confirm() {
  const sp = useSearchParams();
  const router = useRouter();
  const cart = useJacheCart();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const orderId = sp.get('orderId') ?? '';
    const paymentKey = sp.get('paymentKey') ?? '';
    const amount = Number(sp.get('amount'));
    const t = sp.get('t') ?? '';
    fetch('/api/menu/pay/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paymentKey, amount, t }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) throw new Error(d.error || '결제를 확인하지 못했어요');
        cart.clear();
        router.replace(`/menu/done/${encodeURIComponent(orderId)}?t=${encodeURIComponent(t)}`);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FBFAF7] px-6 text-center text-zinc-900" style={FONT}>
      {error ? (
        <>
          <p className="text-lg font-bold">{error}</p>
          <Link href="/menu/checkout" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white">
            주문서로
          </Link>
        </>
      ) : (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-[#CC590C]" />
          <p className="mt-5 text-base font-semibold">결제 확인 중</p>
        </>
      )}
    </main>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
