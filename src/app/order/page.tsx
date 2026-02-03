'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { APARTMENTS, getApartmentFullName } from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { useCart } from '@/hooks/useCart';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { PhoneVerification } from '@/components/features/PhoneVerification';
import { DeliveryForm } from '@/components/features/DeliveryForm';
import { ProductSelector } from '@/components/features/ProductSelector';
import { OrderSummaryBar } from '@/components/features/OrderSummaryBar';
import { ProductDetailImage } from '@/components/features/ProductDetailImage';
import { DeliveryMethodDialog } from '@/components/features/DeliveryMethodDialog';
import { trackPageView } from '@/lib/trackPageView';

// ============================================
// Page Component
// ============================================

export default function OrderPage() {
  const searchParams = useSearchParams();
  const aptCode = searchParams.get('apt');

  // 단지 정보
  const apartment = aptCode ? APARTMENTS[aptCode] : null;

  // 페이지 방문 추적
  useEffect(() => {
    trackPageView('/order', aptCode || undefined);
  }, [aptCode]);

  // 전화번호 인증 훅
  const verification = usePhoneVerification();

  // 배송 정보 상태
  const [name, setName] = useState('');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [allConsent, setAllConsent] = useState(false);
  const [personalInfoConsent, setPersonalInfoConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showPersonalInfoDialog, setShowPersonalInfoDialog] = useState(false);
  const [showMarketingDialog, setShowMarketingDialog] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);
  const [showDeliveryMethodDialog, setShowDeliveryMethodDialog] = useState(false);
  const [showExtendedOrderDialog, setShowExtendedOrderDialog] = useState(false);
  const [showZeroDayDialog, setShowZeroDayDialog] = useState(false);

  // 장바구니 훅
  const { cart, updateQuantity, totalQty, totalAmount, isMinOrderMet } = useCart();

  // 고객 정보 자동 채우기
  useEffect(() => {
    if (verification.customerInfo) {
      if (verification.customerInfo.name) setName(verification.customerInfo.name);
      if (verification.customerInfo.dong) setDong(verification.customerInfo.dong);
      if (verification.customerInfo.ho) setHo(verification.customerInfo.ho);
    }
  }, [verification.customerInfo]);

  // 주문 제출 훅
  const orderSubmit = useOrderSubmit({
    apartment,
    phone: verification.phone,
    name,
    dong,
    ho,
    personalInfoConsent,
    marketingOptIn,
    cart,
    totalQty,
    totalAmount,
  });

  // 마감 체크
  const isExpired = useMemo(() => {
    if (!apartment) return false;
    return new Date() > new Date(apartment.cutoffAt);
  }, [apartment]);

  // 마감일까지 남은 일수 계산
  const daysUntilCutoff = useMemo(() => {
    if (!apartment) return null;
    const now = new Date();
    const cutoff = new Date(apartment.cutoffAt);
    const diffTime = cutoff.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [apartment]);

  // 페이지 로드 시 팝업 표시
  useEffect(() => {
    if (!apartment) return;
    
    // 마감일이 지났으면 추가 주문 안내 팝업
    if (isExpired) {
      setShowExtendedOrderDialog(true);
    }
    // 주문 0일 전 팝업 (마감 당일)
    else if (daysUntilCutoff === 0) {
      setShowZeroDayDialog(true);
    }
  }, [apartment, isExpired, daysUntilCutoff]);

  // 폼 유효성 (동의 체크 제외 - 별도 검증)
  const isFormValid = 
    verification.isPhoneVerified && 
    name.trim() !== '' && 
    dong !== '' && 
    ho.trim() !== '' && 
    isMinOrderMet;

  // 에러 통합 (인증 에러 또는 제출 에러)
  const error = verification.error || orderSubmit.error;
  const setError = (err: string | null) => {
    verification.setError(err);
    orderSubmit.setError(err);
  };

  // 주문 제출 핸들러 (동의 검증 포함)
  const handleOrderSubmit = async () => {
    // 개인정보 동의 필수 체크
    if (!personalInfoConsent) {
      setHighlightConsent(true);
      setError('개인정보 수집 및 이용에 동의해주세요.');
      // 3초 후 강조 해제
      setTimeout(() => {
        setHighlightConsent(false);
        setError(null);
      }, 3000);
      return;
    }
    
    // 배달/픽업 선택 다이얼로그 표시
    setShowDeliveryMethodDialog(true);
  };

  // 배달/픽업 선택 후 실제 주문 진행
  const handleDeliveryMethodSelect = async (isPickup: boolean) => {
    await orderSubmit.handleSubmit(isPickup);
  };

  // 단지 없음
  if (!apartment) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">접근할 수 없는 페이지입니다</h1>
            <p className="text-muted-foreground">
              QR코드를 다시 스캔해주세요.
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
          <h1 className="text-2xl font-bold mb-1">🥟 올때만두</h1>
          <p className="text-orange-100 text-sm">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 단지 정보 */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {getApartmentFullName(apartment)} 공동구매
              </h2>
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-gray-500">주문마감</p>
                  <p className="font-bold text-lg text-brand-dark">
                    {format(new Date(apartment.cutoffAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
                <div className="border-l border-gray-200" />
                <div>
                  <p className="text-gray-500">배송일</p>
                  <p className="font-bold text-lg text-brand">
                    {format(new Date(apartment.deliveryDate), 'M월 d일 (EEE)', { locale: ko })}
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

        {/* 배송 정보 */}
        <DeliveryForm
          name={name}
          setName={setName}
          dong={dong}
          setDong={setDong}
          ho={ho}
          setHo={setHo}
        />

        {/* 상품 선택 */}
        <ProductSelector
          cart={cart}
          updateQuantity={updateQuantity}
          totalQty={totalQty}
          isMinOrderMet={isMinOrderMet}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Footer - PG 심사용 사업자 정보 */}
      <Footer />

      {/* 하단 고정 결제 버튼 */}
      <OrderSummaryBar
        totalQty={totalQty}
        totalAmount={totalAmount}
        isFormValid={isFormValid}
        isSubmitting={orderSubmit.isSubmitting}
        onSubmit={handleOrderSubmit}
      />

      {/* 개인정보 수집 동의 Dialog */}
      <Dialog open={showPersonalInfoDialog} onOpenChange={setShowPersonalInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">수집하는 개인정보 항목</h4>
              <p className="text-gray-600">이름, 전화번호, 주소(동·호수), 주문 내역</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">수집 및 이용 목적</h4>
              <p className="text-gray-600">주문 처리 및 배송, 다음 주문 시 편의 제공</p>
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
        <DialogContent>
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

      {/* 배달/픽업 선택 다이얼로그 */}
      {apartment && (
        <DeliveryMethodDialog
          open={showDeliveryMethodDialog}
          onOpenChange={setShowDeliveryMethodDialog}
          deliveryDate={apartment.deliveryDate}
          onSelect={handleDeliveryMethodSelect}
        />
      )}

      {/* 마감일 지났지만 추가 주문 받는다는 팝업 */}
      <Dialog open={showExtendedOrderDialog} onOpenChange={setShowExtendedOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">📢 추가 주문 안내</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <div className="text-lg font-semibold text-brand">
              주문 마감일이 지났지만,<br />
              많은 분들의 요청에 따라
            </div>
            <div className="text-2xl font-bold text-brand-dark">
              오늘까지 추가주문 받습니다!
            </div>
            <p className="text-gray-600 text-sm">
              설 만두 준비를 놓치신 분들을 위해<br />
              특별히 주문을 연장합니다.
            </p>
            <p className="text-orange-600 font-medium">
              서둘러 주문해주세요! 🥟
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 주문 0일 전 팝업 */}
      <Dialog open={showZeroDayDialog} onOpenChange={setShowZeroDayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">⏰ 주문 마감 임박!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <div className="text-2xl font-bold text-red-600">
              {getApartmentFullName(apartment)} 오늘 주문 마감입니다!
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {format(new Date(apartment.cutoffAt), 'HH:mm', { locale: ko })}에 마감됩니다!
            </div>
            <p className="text-gray-600 text-sm">
              마감 시간 이후에는<br />
              주문이 불가능합니다.
            </p>
            <p className="text-brand font-medium">
              지금 바로 주문하세요! 🥟
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
