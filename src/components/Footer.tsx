/**
 * PG/카드사 심사용 Footer 컴포넌트
 */

import { STORE_INFO } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-8 py-6">
      <div className="max-w-lg mx-auto px-4 text-center text-xs text-gray-500 leading-relaxed space-y-1.5">
        <p className="font-medium text-gray-600">
          {STORE_INFO.name} | 대표: {STORE_INFO.ceo}
        </p>
        <p>
          사업자등록번호: {STORE_INFO.businessNumber} | 통신판매업신고: {STORE_INFO.onlineBusinessNumber}
        </p>
        <p>
          개인정보책임자: {STORE_INFO.ceo}
        </p>
        <p>
          {STORE_INFO.fullAddress}
        </p>
        <p>
          고객센터: {STORE_INFO.phone} | {STORE_INFO.email} | {STORE_INFO.businessHours}
        </p>
        <p className="space-x-2 pt-1">
          <a href="/terms" className="hover:text-brand hover:underline">이용약관</a>
          <span>|</span>
          <a href="/eft-terms" className="hover:text-brand hover:underline">전자금융거래 이용약관</a>
          <span>|</span>
          <a href="/privacy" className="hover:text-brand hover:underline font-semibold">개인정보처리방침</a>
          <span>|</span>
          <a href="/refund" className="hover:text-brand hover:underline">환불정책</a>
        </p>
        <p className="text-[10px] text-gray-400 pt-1">© {new Date().getFullYear()} {STORE_INFO.name} · 대표 {STORE_INFO.ceo}</p>
      </div>
    </footer>
  );
}
