'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Footer } from '@/components/Footer';
import { trackPageView } from '@/lib/trackPageView';
import { captureSource } from '@/lib/sourceTracking';

export default function HomePage() {
  const searchParams = useSearchParams();
  
  // 유입 경로 캡처 (페이지 로드 시 1회)
  useEffect(() => {
    captureSource(searchParams);
  }, []); // 빈 배열로 한 번만 실행
  
  useEffect(() => {
    trackPageView('/');
  }, []);
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      {/* 헤더 */}
      <header className="bg-brand text-white p-8 shadow-lg">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/images/logo.png"
              alt="올때만두"
              width={220}
              height={60}
              priority
            />
          </div>
          <p className="text-orange-100 text-lg">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 비회원 주문 안내 */}
      <div className="max-w-2xl mx-auto px-4 py-2 bg-blue-50 border-b border-blue-100">
        <p className="text-xs text-blue-700 text-center">
          ✓ 회원가입 없이 간편하게 주문하세요 (비회원 주문)
        </p>
      </div>

      {/* 주문내역 확인 링크 */}
      <div className="text-center py-2">
        <Link href="/my-orders" className="text-xs text-gray-400 underline hover:text-brand transition-colors">
          주문내역 확인
        </Link>
      </div>

      {/* 사장님 손글씨 인사말 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 sm:p-6 shadow-sm border border-orange-100">
          <Image
            src="/images/handwriting-greeting.png"
            alt="사장님 손글씨 인사말"
            width={800}
            height={400}
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* 픽업 주문 안내 섹션 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <Link href="/pickup">
          <div className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer">
            <div className="text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl sm:text-3xl">🏪</span>
                <h3 className="text-xl sm:text-2xl font-bold">매장 픽업 주문</h3>
              </div>
              <div className="inline-block bg-white/90 text-orange-600 font-bold text-lg sm:text-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3">
                3,000원 할인!
              </div>
              <p className="text-orange-50 text-xs sm:text-sm">
                누구나 주문 가능 - 송도 내 모든분들 환영!
              </p>
            </div>
          </div>
        </Link>
      </div>

      <Footer />
    </main>
  );
}
