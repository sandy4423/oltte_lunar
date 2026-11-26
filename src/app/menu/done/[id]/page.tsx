import Link from 'next/link';
import { BingsuBanner } from '@/components/jache/BingsuBanner';
import { notFound } from 'next/navigation';
import { orderStore, verifyOrderTokenFor, isOrderId } from '@/lib/jache/orderStore.server';
import { won } from '@/lib/jache/cart';

export const dynamic = 'force-dynamic';

const FONT = { fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif' };

export default async function DonePage({ params, searchParams }: { params: { id: string }; searchParams: { t?: string } }) {
  const id = decodeURIComponent(params.id);
  if (!isOrderId(id) || !verifyOrderTokenFor(id, searchParams.t)) notFound();
  const o = await orderStore().get(id);
  if (!o || o.status === 'PENDING') notFound();

  // 취소 알림톡 버튼이 이 화면으로 온다 → 404 대신 「취소·환불」 상태를 보여 준다 (결제 전 취소면 환불 줄 없음)
  const cancelled = o.status === 'CANCELLED';
  const refunded = cancelled && !!o.paidAt;
  const sent = o.status === 'POS_OK';
  const shortNo = o.orderNumber.replace(/^테스트-/, '');

  return (
    <main className="min-h-dvh bg-[#FBFAF7] pb-16 text-zinc-900" style={FONT}>
      <div className="mx-auto max-w-xl px-5">
        <section className="pb-8 pt-14 text-center">
          {o.test && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">시험 주문</span>}
          <p className="mt-3 text-sm font-semibold text-zinc-500">{cancelled ? '주문 취소' : sent ? '주문 접수' : '가게 확인 중'}</p>
          <p className={`mt-1 text-[56px] font-extrabold leading-none tracking-tight tabular-nums ${cancelled ? 'text-zinc-300' : 'text-[#CC590C]'}`}>{shortNo}</p>
          {cancelled ? (
            <p className="mt-5 text-xl font-bold">{refunded ? `${won(o.totalAmount)} 환불 완료` : '주문이 취소됐어요'}</p>
          ) : (
            <>
              <p className="mt-5 text-xl font-bold">{o.pickupLabel} 픽업</p>
              <p className="mt-1.5 text-sm text-zinc-500">사거리 모서리, 파출소 대각선 맞은편</p>
              {!sent && <p className="mt-4 text-sm font-semibold text-red-600">접수가 늦어지고 있어요. 곧 연락드릴게요</p>}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4">
          <ul className="divide-y divide-zinc-100">
            {o.lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-snug">
                    {l.title} <span className="font-semibold text-zinc-500">×{l.qty}</span>
                    {l.gift && <span className="ml-1.5 text-[13px] font-semibold text-green-700">증정</span>}
                  </p>
                  {l.choices.length > 0 && (
                    <p className="mt-0.5 text-[13px] text-zinc-500">{l.choices.map((c) => (c.qty > 1 ? `${c.title} ${c.qty}` : c.title)).join(' · ')}</p>
                  )}
                </div>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{won(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {o.requests.length > 0 && <p className="mt-3 border-t border-zinc-100 pt-3 text-[13px] text-zinc-600">{o.requests.join(' · ')}</p>}
          <div className="mt-3 flex items-baseline justify-between border-t border-zinc-100 pt-3">
            <span className="text-sm font-semibold text-zinc-600">{refunded ? '환불' : '결제'}</span>
            <span className={`text-lg font-extrabold tabular-nums ${cancelled ? 'text-zinc-500' : ''}`}>{won(o.totalAmount)}</span>
          </div>
          {o.discountAmount > 0 && <p className="mt-0.5 text-right text-xs text-zinc-500">할인 −{won(o.discountAmount)} 포함</p>}
        </section>

        {/* 빙수 배너는 결제완료 화면에만 (사장님 11-19 「결제완료화면에만 배너 둬」) */}
        {!cancelled && <BingsuBanner variant={shortNo.length + (o.lines[0]?.qty ?? 0)} />}

        <Link href="/menu" className="mt-6 flex h-12 items-center justify-center rounded-2xl text-sm font-bold text-zinc-600 ring-1 ring-zinc-300">
          메뉴 보기
        </Link>
      </div>
    </main>
  );
}
