import type { Metadata } from 'next';
import { CLOSED_MESSAGE } from '@/lib/ordering';

export const metadata: Metadata = {
  title: '올때만두 | 온라인 주문 쉬는 중',
  robots: { index: false },
};

export default function ClosedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl px-6 py-10 text-center">
        <p className="text-sm font-semibold text-orange-600 mb-3">올때만두</p>
        <h1 className="text-xl font-bold text-gray-900 leading-snug">
          지금은 온라인 주문을
          <br />
          쉬고 있어요
        </h1>
        <p className="mt-3 text-base text-gray-600">매장으로 와 주세요.</p>
        <p className="sr-only">{CLOSED_MESSAGE}</p>
      </div>
    </main>
  );
}
