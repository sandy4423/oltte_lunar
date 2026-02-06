'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { APARTMENTS, getApartmentFullName, STORE_INFO } from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { useCart } from '@/hooks/useCart';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { useOrderPopups } from '@/hooks/useOrderPopups';
import { PhoneVerification } from '@/components/features/PhoneVerification';
import { DeliveryForm } from '@/components/features/DeliveryForm';
import { ProductSelector } from '@/components/features/ProductSelector';
import { OrderSummaryBar } from '@/components/features/OrderSummaryBar';
import { ProductDetailImage } from '@/components/features/ProductDetailImage';
import { DeliveryMethodDialog } from '@/components/features/DeliveryMethodDialog';
import { trackPageView } from '@/lib/trackPageView';
import { captureSource } from '@/lib/sourceTracking';

// ============================================
// Page Component
// ============================================

export default function OrderPage() {
  const searchParams = useSearchParams();
  const aptCode = searchParams.get('apt');

  // 단지 정보
  const apartment = aptCode ? APARTMENTS[aptCode] : null;

  // 유입 경로 캡처 (페이지 로드 시 1회)
  useEffect(() => {
    captureSource(searchParams);
  }, []); // 빈 배열로 한 번만 실행

  // setTimeout cleanup
  useEffect(() => {
    return () => {
      if (consentTimerRef.current) clearTimeout(consentTimerRef.current);
    };
  }, []);

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
  const consentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 장바구니 훅
  const { cart, updateQuantity, totalQty, totalAmount, isMinOrderMet } = useCart();

  // 팝업 관리 훅
  const { activePopup, closePopup, isExpired, isDeliveryDatePassed } = useOrderPopups(apartment);

  // 실시간 현재 시각
  const [currentTime, setCurrentTime] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  // 현재 시각 업데이트 (1초마다)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, 'M월 d일 HH:mm:ss', { locale: ko }));
    };
    
    updateTime(); // 초기 설정
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer); // cleanup
  }, []);

  // 마감까지 남은 시간 계산
  useEffect(() => {
    if (!apartment) return;

    const updateRemaining = () => {
      const now = new Date();
      const cutoff = new Date(apartment.cutoffAt);
      const diff = cutoff.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('마감됨');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}시간 ${minutes}분`);
      } else {
        setTimeRemaining(`${minutes}분`);
      }
    };
    
    updateRemaining(); // 초기 설정
    const timer = setInterval(updateRemaining, 1000);
    
    return () => clearInterval(timer); // cleanup
  }, [apartment]);

  // 추가 주문 마감 시간 (배송일 새벽 6시)
  const extendedOrderDeadline = useMemo(() => {
    if (!apartment) return null;
    const deadline = new Date(apartment.deliveryDate);
    deadline.setHours(6, 0, 0, 0);
    return deadline;
  }, [apartment]);

  // 추가 주문 마감까지 남은 시간
  const [extendedTimeRemaining, setExtendedTimeRemaining] = useState('');

  useEffect(() => {
    if (!extendedOrderDeadline || activePopup !== 'extendedOrder') return;
    
    const updateExtendedRemaining = () => {
      const now = new Date();
      const diff = extendedOrderDeadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setExtendedTimeRemaining('마감됨');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setExtendedTimeRemaining(`${hours}시간 ${minutes}분`);
      } else {
        setExtendedTimeRemaining(`${minutes}분`);
      }
    };
    
    updateExtendedRemaining(); // 초기 설정
    const timer = setInterval(updateExtendedRemaining, 1000);
    
    return () => clearInterval(timer); // cleanup
  }, [extendedOrderDeadline, activePopup]);

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
      // 3초 후 강조 해제 (기존 타이머 정리)
      if (consentTimerRef.current) clearTimeout(consentTimerRef.current);
      consentTimerRef.current = setTimeout(() => {
        setHighlightConsent(false);
        setError(null);
        consentTimerRef.current = null;
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
              
              {/* 현재 시각 및 남은 시간 */}
              <div className="mb-4 space-y-1">
                <p className="text-sm text-gray-500">
                  현재 시각: <span className="font-semibold text-gray-700">{currentTime}</span>
                </p>
                {!isExpired && timeRemaining !== '마감됨' && (
                  <p className="text-sm text-orange-600 font-medium">
                    ⏰ 마감까지 {timeRemaining}
                  </p>
                )}
              </div>
              
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">주문마감</p>
                  
                  {/* 마감일 지나지 않은 경우 */}
                  {!isExpired && (
                    <>
                      <p className="font-bold text-lg text-brand-dark">
                        {format(new Date(apartment.cutoffAt), 'M.d(EEE) HH:mm', { locale: ko })}
                      </p>
                      <p className="text-xs text-gray-400 line-through mt-1">
                        전단지상: {format(new Date(apartment.originalCutoffAt), 'M.d(EEE) HH:mm', { locale: ko })}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-2">
                        📢 많은 고객님들의 요청에 따라<br />마감일이 연장되었습니다
                      </p>
                    </>
                  )}
                  
                  {/* 마감일 지났지만 배송일 전 (추가 주문 가능) */}
                  {isExpired && !isDeliveryDatePassed && (
                    <>
                      <p className="font-bold text-lg text-orange-600">
                        추가주문 가능!
                      </p>
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        {format(new Date(apartment.deliveryDate), 'M.d(EEE) 06:00', { locale: ko })}까지
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-through">
                        원래 마감: {format(new Date(apartment.cutoffAt), 'M.d(EEE) HH:mm', { locale: ko })}
                      </p>
                    </>
                  )}
                  
                  {/* 배송일 지남 (픽업만 가능) */}
                  {isDeliveryDatePassed && (
                    <>
                      <p className="font-bold text-lg text-red-600">
                        마감됨
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        픽업만 가능
                      </p>
                    </>
                  )}
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
        {/* 상품 선택 */}
        <ProductSelector
          cart={cart}
          updateQuantity={updateQuantity}
          totalQty={totalQty}
          isMinOrderMet={isMinOrderMet}
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
        <DialogContent onClose={() => setShowPersonalInfoDialog(false)}>
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
      <Dialog open={activePopup === 'extendedOrder'} onOpenChange={closePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">📢 추가 주문 안내</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <p className="text-center text-xl font-bold text-brand-dark">
              QR을 찍어주셔서 감사합니다!
            </p>
            <div className="text-lg font-semibold text-brand">
              주문 마감일이 지났지만,<br />
              많은 분들의 요청에 따라
            </div>
            <div className="text-2xl font-bold text-brand-dark">
              배송일 새벽 6시까지 추가주문 받습니다!
            </div>
            
            {/* 마감 시간 및 카운트다운 */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">현재 시각: {currentTime}</p>
              <div className="text-2xl font-bold text-orange-600">
                {format(new Date(apartment.deliveryDate), 'M월 d일 (EEE) 06:00', { locale: ko })}에 마감!
              </div>
              <p className="text-lg font-semibold text-orange-600">
                ⏰ {extendedTimeRemaining} 남음
              </p>
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
      <Dialog open={activePopup === 'zeroDayWarning'} onOpenChange={closePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">⏰ 주문 마감 임박!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <p className="text-center text-xl font-bold text-brand-dark">
              QR을 찍어주셔서 감사합니다!
            </p>
            <div className="text-2xl font-bold text-red-600">
              {getApartmentFullName(apartment)} 오늘 주문 마감입니다!
            </div>
            
            {/* 현재 시각 및 남은 시간 강조 */}
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">현재 시각: {currentTime}</p>
              <div className="text-2xl font-bold text-red-600">
                {format(new Date(apartment.cutoffAt), 'HH:mm', { locale: ko })}에 마감!
              </div>
              <p className="text-lg font-semibold text-orange-600">
                ⏰ {timeRemaining} 남음
              </p>
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

      {/* 배송일 지나서 픽업만 가능 팝업 */}
      <Dialog open={activePopup === 'pickupOnly'} onOpenChange={closePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">🏪 매장 픽업 주문</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <p className="text-center text-xl font-bold text-brand-dark">
              QR을 찍어주셔서 감사합니다!
            </p>
            <div className="text-lg font-semibold text-gray-900">
              배송일이 지나서<br />
              <span className="text-brand-dark">매장 픽업만 가능</span>합니다
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-2">
              <div className="text-2xl font-bold text-orange-600">
                픽업 시 3,000원 할인!
              </div>
              <div className="text-sm text-gray-600">
                픽업 주소: {STORE_INFO.address}
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              주문 후 매장에서 직접 픽업해 주세요.<br />
              픽업 일시는 배송일({format(new Date(apartment.deliveryDate), 'M월 d일 (EEE)', { locale: ko })})과 동일합니다.
            </p>
            <p className="text-brand font-medium">
              지금 바로 주문하세요! 🥟
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 마감 전 환영 팝업 */}
      <Dialog open={activePopup === 'welcome'} onOpenChange={closePopup}>
        <DialogContent className="sm:max-w-md" onClose={closePopup} clickToClose={true}>
          <div className="space-y-4 py-6">
            <p className="text-center text-2xl font-bold text-brand-dark">
              QR을 찍어주셔서 감사합니다!
            </p>
            <p className="text-center text-gray-700">
              저는 e편한세상 후문에서<br />
              열심히 만두 빚고있는 <span className="font-bold text-brand">올때만두</span>입니다.
            </p>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
              <p className="text-center text-gray-800">
                이번 설을 맞아,<br />
                정-말 정성스럽게 <span className="font-semibold">만두와 떡과 육수</span>를<br />
                준비했습니다.
              </p>
            </div>
            <p className="text-center text-gray-700">
              아래 주문페이지에서 주문 부탁드립니다 :)
            </p>
            <p className="text-center text-lg font-semibold text-brand">
              맛있게 배달해드릴게요!
            </p>
            <p className="text-center text-gray-600 text-sm">
              감사합니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
