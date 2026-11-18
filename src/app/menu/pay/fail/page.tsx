'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function Fail() {
  const sp = useSearchParams();
  const canceled = sp.get('code') === 'PAY_PROCESS_CANCELED';
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center bg-[#FBFAF7] px-6 text-center text-zinc-900"
      style={{ fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' }}
    >
      <p className="text-lg font-bold">{canceled ? '결제를 취소했어요' : '결제가 안 됐어요'}</p>
      {!canceled && sp.get('message') && <p className="mt-1 text-sm text-zinc-500">{sp.get('message')}</p>}
      <Link href="/menu/checkout" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white">
        주문서로
      </Link>
    </main>
  );
}

export default function PayFailPage() {
  return (
    <Suspense>
      <Fail />
    </Suspense>
  );
}
