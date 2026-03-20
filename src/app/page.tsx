'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Session } from '@supabase/supabase-js';

import { Footer } from '@/components/Footer';
import { trackPageView } from '@/lib/trackPageView';
import { captureSource, getStoredSource } from '@/lib/sourceTracking';
import { supabase } from '@/lib/supabase';
import {
  PRODUCTS,
  PICKUP_EVENT_DATES,
  PICKUP_EVENT_TIME_SLOTS,
  DANGOL_DISCOUNT_PER_ITEM,
  getOrderCutoffForDate,
  getAvailableEventDates,
} from '@/lib/constants';

export default function HomePage() {
  const searchParams = useSearchParams();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDangol, setIsDangol] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // 유입 경로 캡처
  useEffect(() => {
    captureSource(searchParams);
  }, [searchParams]);

  // 페이지뷰 추적
  useEffect(() => {
    trackPageView('/');
  }, []);

  // 단골톡방 확인
  useEffect(() => {
    setIsDangol(getStoredSource() === 'dangol');
  }, []);

  // 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 마감 카운트다운 + 가용 날짜 계산
  useEffect(() => {
    const update = () => {
      const dates = getAvailableEventDates();
      setAvailableDates(dates);

      if (dates.length === 0) {
        setTimeRemaining('마감됨');
        return;
      }

      const nextCutoff = new Date(getOrderCutoffForDate(dates[0]));
      const now = new Date();
      const diff = nextCutoff.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('마감됨');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}시간 ${minutes}분`);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleKakaoLogin = async () => {
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('카카오 로그인 오류:', error);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const kakaoName =
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.full_name ||
    '';

  const isEventClosed = availableDates.length === 0;

  const mainProducts = PRODUCTS.filter((p) => !p.isOption);
  const optionProducts = PRODUCTS.filter((p) => p.isOption);

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
          <p className="text-orange-100 text-lg">전골은 제가 끓여드릴게요</p>
        </div>
      </header>

      {/* 로그인 상태 표시 */}
      {!sessionLoading && session && (
        <div className="max-w-2xl mx-auto px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
          <p className="text-sm text-yellow-800">
            👋{' '}
            {kakaoName ? (
              <>
                <span className="font-semibold">{kakaoName}</span>님, 환영합니다!
              </>
            ) : (
              '로그인되었습니다!'
            )}
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 주문내역 확인 링크 */}
      <div className="text-center py-2">
        <Link href="/my-orders" className="text-xs text-gray-400 underline hover:text-brand transition-colors">
          주문내역 확인
        </Link>
      </div>

      {/* 단골톡방 할인 배너 */}
      {isDangol && (
        <div className="max-w-2xl mx-auto px-4 mt-2">
          <div className="bg-yellow-400 rounded-lg p-4 text-center shadow-sm">
            <p className="text-yellow-900 font-bold text-lg">🎉 단골톡방 전용 할인</p>
            <p className="text-yellow-800 text-sm mt-1">
              전골 1개당 <strong>{DANGOL_DISCOUNT_PER_ITEM.toLocaleString()}원</strong> 할인 적용됩니다!
            </p>
          </div>
        </div>
      )}

      {/* 이벤트 정보 카드 */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-xl shadow-xl border-0 p-6">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
            🍲 주말 만두전골 예약주문
          </h2>

          {isEventClosed ? (
            <div className="bg-red-50 rounded-lg p-5 text-center">
              <p className="text-red-600 font-bold text-lg">예약이 마감되었습니다</p>
              <p className="text-red-500 text-sm mt-2">다음 이벤트를 기다려주세요 😊</p>
            </div>
          ) : (
            <>
              {/* 픽업 날짜/시간 정보 */}
              <div className="flex justify-center gap-8 text-sm mb-4">
                <div className="text-center">
                  <p className="text-gray-500 mb-1">픽업 날짜</p>
                  <p className="font-bold text-lg text-brand">
                    {PICKUP_EVENT_DATES.map((d) =>
                      format(new Date(d + 'T00:00:00'), 'M/d(EEE)', { locale: ko })
                    ).join(', ')}
                  </p>
                </div>
                <div className="border-l border-gray-200" />
                <div className="text-center">
                  <p className="text-gray-500 mb-1">픽업 시간</p>
                  <p className="font-bold text-lg text-brand-dark">
                    {PICKUP_EVENT_TIME_SLOTS[0]} ~ {PICKUP_EVENT_TIME_SLOTS[PICKUP_EVENT_TIME_SLOTS.length - 1]}
                  </p>
                </div>
              </div>

              {/* 마감 카운트다운 */}
              {timeRemaining && timeRemaining !== '마감됨' && (
                <p className="text-center text-sm text-orange-600 font-medium mb-3">
                  ⏰ 다음 마감까지 <strong>{timeRemaining}</strong> 남았습니다
                </p>
              )}
              <p className="text-center text-xs text-gray-500 mb-5">
                📢 각 날짜 낮 12시에 예약 마감됩니다
              </p>

              {/* 로그인 / 예약하기 버튼 */}
              {sessionLoading ? (
                <div className="h-14 rounded-xl bg-gray-100 animate-pulse" />
              ) : session ? (
                <Link href="/order">
                  <button className="w-full bg-brand hover:bg-brand-dark text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md">
                    지금 예약하기 →
                  </button>
                </Link>
              ) : (
                <button
                  onClick={handleKakaoLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70"
                  style={{ backgroundColor: '#FEE500', color: '#191919' }}
                >
                  {isLoggingIn ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-transparent" />
                      로그인 중...
                    </>
                  ) : (
                    <>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3C6.477 3 2 6.582 2 11c0 2.776 1.627 5.22 4.094 6.747L5.04 21.18c-.09.324.279.58.553.38L9.6 18.93A11.8 11.8 0 0012 19c5.523 0 10-3.582 10-8s-4.477-8-10-8z"
                          fill="#191919"
                        />
                      </svg>
                      카카오로 시작하기
                    </>
                  )}
                </button>
              )}

              {!session && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  ✓ 카카오 로그인 후 간편하게 예약하실 수 있습니다
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 메뉴 소개 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <h3 className="text-base font-bold text-gray-700 mb-3 px-1">🍲 메뉴 안내</h3>
        <div className="space-y-3">
          {mainProducts.map((product) => (
            <div
              key={product.sku}
              className="bg-white rounded-lg p-4 shadow-sm border border-orange-100 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {product.emoji} {product.name}
                </p>
                <p className="text-sm text-gray-500">{product.description}</p>
                {isDangol && (
                  <p className="text-xs text-red-500 mt-0.5 font-medium">
                    단골 할인 적용 →{' '}
                    {(product.price - DANGOL_DISCOUNT_PER_ITEM).toLocaleString()}원
                  </p>
                )}
              </div>
              <div className="text-right">
                {isDangol ? (
                  <>
                    <p className="font-bold text-brand text-lg">
                      {(product.price - DANGOL_DISCOUNT_PER_ITEM).toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-400 line-through">
                      {product.price.toLocaleString()}원
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-brand text-lg">
                    {product.price.toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 추가 옵션 */}
        <h3 className="text-base font-bold text-gray-700 mt-5 mb-3 px-1">➕ 추가 옵션</h3>
        <div className="space-y-3">
          {optionProducts.map((product) => (
            <div
              key={product.sku}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {product.emoji} {product.name}
                </p>
                <p className="text-sm text-gray-500">{product.description}</p>
              </div>
              <p className="font-bold text-gray-700 text-lg">
                {product.price.toLocaleString()}원
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 픽업 장소 안내 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-orange-800 mb-1">📍 픽업 장소</p>
          <p className="text-sm text-orange-700">
            e편한세상송도 후문상가 안쪽. 컴포즈 옆 (랜드마크로 113)
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
