'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { PICKUP_CONFIG, PICKUP_DISCOUNT } from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { useCart } from '@/hooks/useCart';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { PhoneVerification } from '@/components/features/PhoneVerification';
import { ProductSelector } from '@/components/features/ProductSelector';
import { OrderSummaryBar } from '@/components/features/OrderSummaryBar';
import { ProductDetailImage } from '@/components/features/ProductDetailImage';
import { PickupDateTimeSelector } from '@/components/features/PickupDateTimeSelector';
import { trackPageView } from '@/lib/trackPageView';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================
// Page Component
// ============================================

export default function PickupPage() {
  // 페이지 방문 추적
  useEffect(() => {
    trackPageView('/pickup');
  }, []);

  // 전화번호 인증 훅
  const verification = usePhoneVerification();

  // 고객 정보 상태
  const [name, setName] = useState('');
  const [allConsent, setAllConsent] = useState(false);
  const [personalInfoConsent, setPersonalInfoConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showPersonalInfoDialog, setShowPersonalInfoDialog] = useState(false);
  const [showMarketingDialog, setShowMarketingDialog] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);

  // 픽업 정보 상태
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // 장바구니 훅
  const { cart, updateQuantity, totalQty, totalAmount, isMinOrderMet } = useCart();

  // 실시간 현재 시각
  const [currentTime, setCurrentTime] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  // 현재 시각 업데이트 (1초마다)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, 'M월 d일 HH:mm:ss', { locale: ko }));
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // 마감까지 남은 시간 계산
  useEffect(() => {
    const updateRemaining = () => {
      const now = new Date();
      const cutoff = new Date(PICKUP_CONFIG.cutoffAt);
      const diff = cutoff.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('마감됨');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}일 ${hours}시간`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}시간 ${minutes}분`);
      } else {
        setTimeRemaining(`${minutes}분`);
      }
    };
    
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // 마감 여부
  const isExpired = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(PICKUP_CONFIG.cutoffAt);
    return now >= cutoff;
  }, [currentTime]);

  // 고객 정보 자동 채우기
  useEffect(() => {
    if (verification.customerInfo?.name) {
      setName(verification.customerInfo.name);
    }
  }, [verification.customerInfo]);

  // 주문 제출 훅 (픽업 전용)
  const orderSubmit = useOrderSubmit({
    phone: verification.phone,
    name,
    personalInfoConsent,
    marketingOptIn,
    cart,
    totalQty,
    totalAmount,
    pickupDate,
    pickupTime,
  });

  // 폼 유효성 (동의 체크 제외 - 별도 검증)
  const isFormValid = 
    verification.isPhoneVerified && 
    name.trim() !== '' && 
    pickupDate !== '' &&
    pickupTime !== '' &&
    isMinOrderMet;

  // 에러 통합
  const error = verification.error || orderSubmit.error;
  const setError = (err: string | null) => {
    verification.setError(err);
    orderSubmit.setError(err);
  };

  // 주문 제출 핸들러
  const handleOrderSubmit = async () => {
    // 개인정보 동의 필수 체크
    if (!personalInfoConsent) {
      setHighlightConsent(true);
      setError('개인정보 수집 및 이용에 동의해주세요.');
      setTimeout(() => {
        setHighlightConsent(false);
        setError(null);
      }, 3000);
      return;
    }
    
    // 픽업 정보 검증
    if (!pickupDate || !pickupTime) {
      setError('픽업 날짜와 시간을 선택해주세요.');
      return;
    }
    
    // 픽업 주문 제출 (isPickup은 true로 자동 설정됨)
    await orderSubmit.handleSubmit(true);
  };

  // 마감됨
  if (isExpired) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">주문이 마감되었습니다</h1>
            <p className="text-muted-foreground mb-4">
              픽업 주문은 2월 13일 (금) 23:00에 마감되었습니다.
            </p>
            <p className="text-sm text-gray-600">
              다음 기회에 이용해주세요.
            </p>
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
            <Image
              src="/images/logo.png"
              alt="올때만두"
              width={200}
              height={53}
              priority
            />
          </div>
          <p className="text-orange-100 text-sm">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 픽업 주문 정보 */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                🏪 매장 픽업 주문
              </h2>
              
              {/* 할인 강조 */}
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-3 mb-4">
                <p className="text-xl font-bold text-orange-700">
                  픽업 시 {PICKUP_DISCOUNT.toLocaleString()}원 할인!
                </p>
              </div>
              
              {/* 현재 시각 및 남은 시간 */}
              <div className="mb-4 space-y-1">
                <p className="text-sm text-gray-500">
                  현재 시각: <span className="font-semibold text-gray-700">{currentTime}</span>
                </p>
                {timeRemaining !== '마감됨' && (
                  <p className="text-sm text-orange-600 font-medium">
                    ⏰ 마감까지 {timeRemaining}
                  </p>
                )}
              </div>
              
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">주문마감</p>
                  <p className="font-bold text-lg text-brand-dark">
                    {format(new Date(PICKUP_CONFIG.cutoffAt), 'M.d(EEE) HH:mm', { locale: ko })}
                  </p>
                </div>
                <div className="border-l border-gray-200" />
                <div>
                  <p className="text-gray-500">픽업 가능</p>
                  <p className="font-bold text-lg text-brand">
                    2/6 ~ 2/14
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상품 상세 이미지 */}
      <div className="max-w-lg mx-auto mt-6">
        <ProductDetailImage />
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* 상품 선택 */}
        <ProductSelector
          cart={cart}
          updateQuantity={updateQuantity}
          totalQty={totalQty}
          isMinOrderMet={isMinOrderMet}
        />

        {/* 픽업 날짜/시간 선택 */}
        <PickupDateTimeSelector
          pickupDate={pickupDate}
          setPickupDate={setPickupDate}
          pickupTime={pickupTime}
          setPickupTime={setPickupTime}
        />

        {/* 주문자 정보 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-base font-semibold">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* 전화번호 인증 */}
        <PhoneVerification
          phone={verification.phone}
          setPhone={verification.setPhone}
          verificationCode={verification.verificationCode}
          setVerificationCode={verification.setVerificationCode}
          isPhoneVerified={verification.isPhoneVerified}
          isVerifying={verification.isVerifying}
          isSending={verification.isSending}
          verificationSent={verification.verificationSent}
          error={verification.error}
          handleSendVerification={verification.handleSendVerification}
          handleVerifyCode={verification.handleVerifyCode}
          allConsent={allConsent}
          setAllConsent={setAllConsent}
          personalInfoConsent={personalInfoConsent}
          setPersonalInfoConsent={setPersonalInfoConsent}
          marketingOptIn={marketingOptIn}
          setMarketingOptIn={setMarketingOptIn}
          onShowPersonalInfoDialog={() => setShowPersonalInfoDialog(true)}
          onShowMarketingDialog={() => setShowMarketingDialog(true)}
          highlightConsent={highlightConsent}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* 하단 고정 결제 버튼 */}
      <OrderSummaryBar
        totalQty={totalQty}
        totalAmount={totalAmount - PICKUP_DISCOUNT}
        isFormValid={isFormValid}
        isSubmitting={orderSubmit.isSubmitting}
        onSubmit={handleOrderSubmit}
      />

      {/* 개인정보 수집 동의 Dialog */}
      <Dialog open={showPersonalInfoDialog} onOpenChange={setShowPersonalInfoDialog}>
        <DialogContent onClose={() => setShowPersonalInfoDialog(false)}>
          <DialogHeader>
            <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">수집하는 개인정보 항목</h4>
              <p className="text-gray-600">이름, 전화번호, 주문 내역</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">수집 및 이용 목적</h4>
              <p className="text-gray-600">주문 처리 및 픽업 안내, 다음 주문 시 편의 제공</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">보유 및 이용 기간</h4>
              <p className="text-gray-600">최종 주문일로부터 1년</p>
            </div>
            <p className="text-xs text-gray-500">
              위 개인정보 수집에 동의하지 않을 권리가 있으며, 동의를 거부할 경우 서비스 이용이 제한됩니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 마케팅 정보 수신 동의 Dialog */}
      <Dialog open={showMarketingDialog} onOpenChange={setShowMarketingDialog}>
        <DialogContent onClose={() => setShowMarketingDialog(false)}>
          <DialogHeader>
            <DialogTitle>마케팅 정보 수신 동의</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">수신 정보</h4>
              <p className="text-gray-600">신규 상품 안내, 이벤트 정보, 프로모션 안내</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">수신 방법</h4>
              <p className="text-gray-600">SMS 문자 메시지</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">동의 철회</h4>
              <p className="text-gray-600">언제든지 고객센터를 통해 철회 가능합니다.</p>
            </div>
            <p className="text-xs text-gray-500">
              마케팅 정보 수신은 선택 사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
