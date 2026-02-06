/**
 * PG 심사용 Footer 컴포넌트 (컴팩트 버전)
 */

import { STORE_INFO } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-8 py-4">
      <div className="max-w-lg mx-auto px-4 text-center text-[10px] text-gray-400 leading-tight space-y-1">
        <p>
          {STORE_INFO.name} | 사업자등록번호: {STORE_INFO.businessNumber} | 대표: {STORE_INFO.ceo} | 개인정보책임자: {STORE_INFO.ceo}
        </p>
        <p>
          {STORE_INFO.fullAddress}
        </p>
        <p>
          {STORE_INFO.phone} | {STORE_INFO.email} | {STORE_INFO.businessHours}
        </p>
        <p className="space-x-2">
          <a href="/terms" className="hover:text-brand hover:underline">이용약관</a>
          <span>|</span>
          <a href="/privacy" className="hover:text-brand hover:underline">개인정보처리방침</a>
          <span>|</span>
          <a href="/refund" className="hover:text-brand hover:underline">환불정책</a>
        </p>
        <p className="text-[9px] text-gray-300">© {new Date().getFullYear()} {STORE_INFO.name} · 대표 {STORE_INFO.ceo}</p>
      </div>
    </footer>
  );
}
