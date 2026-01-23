/**
 * PG 심사용 Footer 컴포넌트
 * 사업자 정보, 연락처, 정책 링크 등 포함
 */

import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-8">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* 사업자 정보 */}
        <div className="text-center mb-6">
          <h3 className="font-bold text-gray-900 mb-2">🥟 올때만두</h3>
          <p className="text-sm text-gray-600">
            대표: 성하경 | 사업자등록번호: 286-34-01627
          </p>
        </div>

        {/* 연락처 정보 */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>랜드마크로 113 후문상가 올때만두</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href="tel:032-832-5012" className="hover:text-red-600">
              032-832-5012
            </a>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href="mailto:info@olttefood.com" className="hover:text-red-600">
              info@olttefood.com
            </a>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>평일 09:00 - 18:00</span>
          </div>
        </div>

        {/* 정책 링크 */}
        <div className="flex justify-center gap-4 mt-6 text-xs text-gray-500">
          <a href="/terms" className="hover:text-gray-700 hover:underline">
            이용약관
          </a>
          <span>|</span>
          <a href="/privacy" className="hover:text-gray-700 hover:underline">
            개인정보처리방침
          </a>
          <span>|</span>
          <a href="/refund" className="hover:text-gray-700 hover:underline">
            환불정책
          </a>
        </div>

        {/* 저작권 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} 올때만두. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
