'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Minus, Plus, AlertCircle, ChevronDown } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Footer } from '@/components/Footer';

import { supabase } from '@/lib/supabase';
import { captureSource, getStoredSource } from '@/lib/sourceTracking';
import { trackPageView } from '@/lib/trackPageView';
import {
  PRODUCTS,
  PICKUP_EVENT_DATES,
  PICKUP_EVENT_TIME_SLOTS,
  DANGOL_DISCOUNT_PER_ITEM,
  DANGOL_DISCOUNT_ELIGIBLE_SKUS,
  NOODLE_DISCOUNT_PER_ITEM,
  NOODLE_DISCOUNT_SKU,
  getOrderCutoffForDate,
  getAvailableEventDates,
} from '@/lib/constants';
import { useCart } from '@/hooks/useCart';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';

export default function OrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 세션
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // 고객 정보
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // 픽업 선택
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // 단골톡방 할인
  const [isDangol, setIsDangol] = useState(false);

  // 마감 상태
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState('');

  // 동의 상태
  const [personalInfoConsent, setPersonalInfoConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [eftTermsConsent, setEftTermsConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [allConsent, setAllConsent] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);
  const consentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 약관 다이얼로그
  const [showPersonalInfoDialog, setShowPersonalInfoDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showEftTermsDialog, setShowEftTermsDialog] = useState(false);

  // 결제 처리 상태
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // 장바구니
  const { cart, updateQuantity, totalQty, totalAmount, hotpotQty, calcDangolDiscount } = useCart();

  const dangolDiscount = calcDangolDiscount(isDangol);
  const finalAmount = totalAmount - dangolDiscount;

  // 주문 제출
  const orderSubmit = useOrderSubmit({
    phone,
    name,
    personalInfoConsent,
    marketingOptIn,
    cart,
    totalQty,
    totalAmount,
    pickupDate,
    pickupTime,
  });

  // 세션 로드
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
      // 카카오 닉네임 자동 채우기
      const kakaoName =
        session?.user?.user_metadata?.name ||
        session?.user?.user_metadata?.full_name ||
        '';
      if (kakaoName) setName(kakaoName);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 미로그인 시 홈으로 리다이렉트
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/');
    }
  }, [sessionLoading, session, router]);

  // 유입 경로 캡처 + 단골 확인
  useEffect(() => {
    captureSource(searchParams);
    setIsDangol(getStoredSource() === 'dangol');
  }, [searchParams]);

  // 페이지뷰 추적
  useEffect(() => {
    trackPageView('/order');
  }, []);

  // 가용 날짜 + 카운트다운
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

  // 전체 동의 처리
  const handleAllConsent = (checked: boolean) => {
    setAllConsent(checked);
    setPersonalInfoConsent(checked);
    setTermsConsent(checked);
    setEftTermsConsent(checked);
    setMarketingOptIn(checked);
  };

  useEffect(() => {
    setAllConsent(personalInfoConsent && termsConsent && eftTermsConsent && marketingOptIn);
  }, [personalInfoConsent, termsConsent, eftTermsConsent, marketingOptIn]);

  // 픽업 날짜 변경 시 시간 초기화
  const handleDateChange = (date: string) => {
    setPickupDate(date);
    setPickupTime('');
  };

  // 주문 생성 후 토스 결제 호출
  useEffect(() => {
    if (orderSubmit.createdOrderId && orderSubmit.finalAmount > 0) {
      handleCardPayment(orderSubmit.createdOrderId, orderSubmit.finalAmount);
    }
  }, [orderSubmit.createdOrderId]);

  const handleCardPayment = async (orderId: number, amount: number) => {
    setIsPaymentProcessing(true);
    try {
      const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) throw new Error('결제 시스템 설정 오류');

      const tossPayments = await loadTossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount,
        orderId: `CARD_${orderId}_${Date.now()}`,
        orderName: '올때만두 만두전골',
        customerName: name,
        successUrl: `${window.location.origin}/order/success`,
        failUrl: `${window.location.origin}/order/fail?orderId=${orderId}`,
      });
    } catch (err: unknown) {
      const tossErr = err as { code?: string; message?: string };
      if (tossErr?.code === 'USER_CANCEL') {
        orderSubmit.setError('결제를 취소하셨습니다.');
      } else {
        orderSubmit.setError(tossErr?.message || '결제 중 오류가 발생했습니다.');
      }
      setIsPaymentProcessing(false);
    }
  };

  // 주문 제출 핸들러 (동의 검증 포함)
  const handleOrderSubmit = async () => {
    if (!termsConsent || !eftTermsConsent || !personalInfoConsent) {
      setHighlightConsent(true);
      const missing = [];
      if (!termsConsent) missing.push('이용약관');
      if (!eftTermsConsent) missing.push('전자금융거래 이용약관');
      if (!personalInfoConsent) missing.push('개인정보 수집 및 이용');
      orderSubmit.setError(`${missing.join(', ')} 동의가 필요합니다.`);
      if (consentTimerRef.current) clearTimeout(consentTimerRef.current);
      consentTimerRef.current = setTimeout(() => {
        setHighlightConsent(false);
        orderSubmit.setError(null);
        consentTimerRef.current = null;
      }, 3000);
      return;
    }
    await orderSubmit.handleSubmit();
  };

  const isFormValid =
    totalQty > 0 &&
    hotpotQty > 0 &&
    name.trim() !== '' &&
    phone.trim().length >= 10 &&
    pickupDate !== '' &&
    pickupTime !== '';

  const isEventClosed = availableDates.length === 0;

  const mainProducts = PRODUCTS.filter((p) => !p.isOption);
  const optionProducts = PRODUCTS.filter((p) => p.isOption);

  // 로딩 중
  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">잠시만 기다려주세요...</p>
        </div>
      </main>
    );
  }

  // 마감 상태
  if (isEventClosed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-amber-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-4xl mb-4">🍲</p>
            <h1 className="text-xl font-bold mb-2">예약이 마감되었습니다</h1>
            <p className="text-muted-foreground mb-4">다음 이벤트를 기다려주세요!</p>
            <Link href="/">
              <Button className="w-full bg-brand hover:bg-brand-dark">홈으로 돌아가기</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-32">
      {/* 헤더 */}
      <header className="bg-brand text-white p-6 shadow-lg">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex justify-center mb-1">
            <Image src="/images/logo.png" alt="올때만두" width={200} height={53} priority />
          </div>
          <p className="text-orange-100 text-sm">전골은 제가 끓여드릴게요</p>
        </div>
      </header>

      {/* 주문내역 확인 링크 */}
      <div className="text-center py-2">
        <Link href="/my-orders" className="text-xs text-gray-400 underline hover:text-brand transition-colors">
          주문내역 확인
        </Link>
      </div>

      {/* 이벤트 정보 카드 */}
      <div className="max-w-lg mx-auto px-4 -mt-1">
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="pt-5 pb-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-3">🍲 주말 만두전골 예약주문</h2>

              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">픽업 날짜</p>
                  <p className="font-bold text-lg text-brand">
                    {PICKUP_EVENT_DATES.map((d) =>
                      format(new Date(d + 'T00:00:00'), 'M/d(EEE)', { locale: ko })
                    ).join(', ')}
                  </p>
                </div>
                <div className="border-l border-gray-200" />
                <div>
                  <p className="text-gray-500 mb-1">주문 마감</p>
                  <p className="font-bold text-lg text-brand-dark">
                    각 날짜 낮 12:00
                  </p>
                </div>
              </div>

              {timeRemaining && timeRemaining !== '마감됨' && (
                <p className="text-sm text-orange-600 font-medium mt-3">
                  ⏰ 다음 마감까지 <strong>{timeRemaining}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 단골 할인 배너 */}
      {isDangol && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="bg-yellow-400 rounded-lg p-3 text-center">
            <p className="text-yellow-900 font-bold">
              🎉 단골톡방 전용 할인 – 전골 {DANGOL_DISCOUNT_PER_ITEM.toLocaleString()}원, 칼국수 {NOODLE_DISCOUNT_PER_ITEM.toLocaleString()}원 할인!
            </p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-5">

        {/* 전골 선택 */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">전골 선택</h3>
            <div className="space-y-4">
              {mainProducts.map((product) => {
                const cartItem = cart.find((c) => c.sku === product.sku);
                const qty = cartItem?.qty ?? 0;
                const displayPrice = isDangol
                  ? product.price - DANGOL_DISCOUNT_PER_ITEM
                  : product.price;

                return (
                  <div key={product.sku} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {product.emoji} {product.name}
                      </p>
                      <p className="text-sm text-gray-500">{product.description}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-brand">
                          {displayPrice.toLocaleString()}원
                        </p>
                        {isDangol && (
                          <p className="text-xs text-gray-400 line-through">
                            {product.price.toLocaleString()}원
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.sku, -1)}
                        aria-label={`${product.name} 수량 감소`}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                        disabled={qty === 0}
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
                      <button
                        onClick={() => updateQuantity(product.sku, 1)}
                        aria-label={`${product.name} 수량 증가`}
                        className="w-8 h-8 rounded-full border border-brand flex items-center justify-center hover:bg-orange-50 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-brand" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 추가 옵션 */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">추가 옵션</h3>
            <div className="space-y-4">
              {optionProducts.map((product) => {
                const cartItem = cart.find((c) => c.sku === product.sku);
                const qty = cartItem?.qty ?? 0;
                const isNoodle = product.sku === NOODLE_DISCOUNT_SKU;
                const noodleDiscounted = isDangol && isNoodle;
                const optionDisplayPrice = noodleDiscounted
                  ? product.price - NOODLE_DISCOUNT_PER_ITEM
                  : product.price;

                return (
                  <div key={product.sku} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {product.emoji} {product.name}
                      </p>
                      <p className="text-sm text-gray-500">{product.description}</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${noodleDiscounted ? 'text-brand' : 'text-gray-700'}`}>
                          {optionDisplayPrice.toLocaleString()}원
                        </p>
                        {noodleDiscounted && (
                          <p className="text-xs text-gray-400 line-through">
                            {product.price.toLocaleString()}원
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.sku, -1)}
                        aria-label={`${product.name} 수량 감소`}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                        disabled={qty === 0}
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
                      <button
                        onClick={() => updateQuantity(product.sku, 1)}
                        aria-label={`${product.name} 수량 증가`}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 픽업 날짜/시간 선택 */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h3 className="text-base font-bold text-gray-900">픽업 날짜 / 시간 선택</h3>

            {/* 날짜 선택 */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                픽업 날짜 <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateChange(date)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      pickupDate === date
                        ? 'border-brand bg-orange-50 text-brand'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                    }`}
                  >
                    {format(new Date(date + 'T00:00:00'), 'M월 d일 (EEE)', { locale: ko })}
                  </button>
                ))}
              </div>
            </div>

            {/* 시간 선택 */}
            {pickupDate && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  픽업 시간 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    aria-label="픽업 시간 선택"
                    className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    <option value="">시간 선택</option>
                    {PICKUP_EVENT_TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* 픽업 장소 안내 */}
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-orange-700 font-medium">📍 픽업 장소</p>
              <p className="text-xs text-orange-600 mt-0.5">
                e편한세상송도 후문상가 안쪽. 컴포즈 옆 (랜드마크로 113)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 주문자 정보 */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h3 className="text-base font-bold text-gray-900">주문자 정보</h3>

            <div>
              <Label htmlFor="name" className="text-sm font-semibold">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-semibold">
                연락처 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                픽업 안내 및 주문 확인 연락에 사용됩니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 주문 금액 요약 */}
        {totalQty > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">주문 요약</h3>
              <div className="space-y-1.5 text-sm">
                {cart.filter((item) => item.qty > 0).map((item) => {
                  const product = PRODUCTS.find((p) => p.sku === item.sku)!;
                  return (
                    <div key={item.sku} className="flex justify-between">
                      <span className="text-gray-600">
                        {product.name} × {item.qty}
                      </span>
                      <span className="font-medium">
                        {(product.price * item.qty).toLocaleString()}원
                      </span>
                    </div>
                  );
                })}
                {dangolDiscount > 0 && (
                  <div className="flex justify-between text-red-600 pt-1 border-t border-orange-200">
                    <span>단골톡방 할인</span>
                    <span className="font-medium">-{dangolDiscount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-orange-300">
                  <span>총 결제금액</span>
                  <span className="text-brand">{finalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 약관 동의 */}
        <Card className={highlightConsent ? 'ring-2 ring-destructive' : ''}>
          <CardContent className="pt-5 space-y-3">
            {/* 전체 동의 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allConsent}
                onChange={(e) => handleAllConsent(e.target.checked)}
                className="w-5 h-5 rounded accent-brand"
              />
              <span className="font-bold text-gray-900">전체 동의</span>
            </label>
            <hr />

            {/* 이용약관 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsConsent}
                onChange={(e) => setTermsConsent(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm flex-1">
                <span className="text-destructive">[필수]</span> 이용약관 동의
              </span>
              <button
                type="button"
                onClick={() => setShowTermsDialog(true)}
                className="text-xs text-gray-400 underline shrink-0"
              >
                보기
              </button>
            </label>

            {/* 전자금융거래 이용약관 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eftTermsConsent}
                onChange={(e) => setEftTermsConsent(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm flex-1">
                <span className="text-destructive">[필수]</span> 전자금융거래 이용약관
              </span>
              <button
                type="button"
                onClick={() => setShowEftTermsDialog(true)}
                className="text-xs text-gray-400 underline shrink-0"
              >
                보기
              </button>
            </label>

            {/* 개인정보 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={personalInfoConsent}
                onChange={(e) => setPersonalInfoConsent(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm flex-1">
                <span className="text-destructive">[필수]</span> 개인정보 수집 및 이용 동의
              </span>
              <button
                type="button"
                onClick={() => setShowPersonalInfoDialog(true)}
                className="text-xs text-gray-400 underline shrink-0"
              >
                보기
              </button>
            </label>

            {/* 마케팅 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm text-gray-600">
                [선택] 마케팅 정보 수신 동의 (할인/이벤트 안내)
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {orderSubmit.error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{orderSubmit.error}</p>
          </div>
        )}
      </div>

      {/* 하단 결제 버튼 (고정) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleOrderSubmit}
            disabled={!isFormValid || orderSubmit.isSubmitting || isPaymentProcessing}
            className="w-full bg-brand hover:bg-brand-dark text-white font-bold text-lg py-6 rounded-xl disabled:opacity-50"
            size="lg"
          >
            {orderSubmit.isSubmitting || isPaymentProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                {orderSubmit.isSubmitting ? '주문 처리 중...' : '결제창 열기...'}
              </>
            ) : (
              <>
                카드로 결제하기{' '}
                {finalAmount > 0 && `· ${finalAmount.toLocaleString()}원`}
              </>
            )}
          </Button>
          {!isFormValid && totalQty === 0 && (
            <p className="text-center text-xs text-gray-500 mt-2">
              전골을 1개 이상 선택해주세요
            </p>
          )}
        </div>
      </div>

      {/* 약관 다이얼로그들 */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이용약관</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3 whitespace-pre-line">
            {`제1조 (목적)
본 약관은 올때만두(이하 "회사")가 제공하는 온라인 주문 서비스 이용에 관한 조건 및 절차를 규정합니다.

제2조 (서비스 이용)
이용자는 본 서비스를 통해 상품을 예약 주문할 수 있으며, 결제 완료 후 주문이 확정됩니다.

제3조 (주문 및 결제)
주문 확정 후 결제 취소는 픽업 전까지 가능합니다. 픽업 당일 취소는 불가합니다.

제4조 (개인정보)
수집된 개인정보는 주문 처리 및 고객 안내 목적으로만 사용됩니다.`}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEftTermsDialog} onOpenChange={setShowEftTermsDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>전자금융거래 이용약관</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3 whitespace-pre-line">
            {`제1조 (목적)
본 약관은 전자금융거래법에 따라 전자금융거래 서비스 이용 조건을 규정합니다.

제2조 (전자금융거래 서비스)
결제 서비스는 토스페이먼츠(주)를 통해 제공되며, 카드 결제가 지원됩니다.

제3조 (오류 처리)
결제 오류 발생 시 즉시 회사에 통보하여 처리받으실 수 있습니다.

제4조 (분쟁 처리)
전자금융거래 관련 분쟁은 전자금융거래법에 따라 처리됩니다.`}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPersonalInfoDialog} onOpenChange={setShowPersonalInfoDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3">
            <p className="font-semibold">수집 항목</p>
            <p>이름, 휴대폰 번호</p>
            <p className="font-semibold">수집 목적</p>
            <p>주문 처리, 픽업 안내, 고객 서비스 제공</p>
            <p className="font-semibold">보유 기간</p>
            <p>주문일로부터 1년</p>
            <p className="text-xs text-gray-400">
              동의를 거부할 수 있으며, 거부 시 서비스 이용이 제한됩니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  );
}
