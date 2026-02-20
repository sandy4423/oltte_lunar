'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Landmark, AlertCircle, CheckCircle, ShieldCheck, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { STORE_INFO } from '@/lib/constants';
import { trackPageView } from '@/lib/trackPageView';

export default function PaymentMethodPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingVbank, setIsProcessingVbank] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  useEffect(() => {
    trackPageView('/order/payment-method');
  }, []);

  useEffect(() => {
    if (!orderId) {
      setError('주문 정보가 없습니다.');
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/detail?orderId=${orderId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || '주문 정보를 불러올 수 없습니다.');
        return;
      }

      setOrder(result.data);
    } catch {
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVirtualAccount = async () => {
    if (!order) return;
    setIsProcessingVbank(true);

    try {
      const response = await fetch('/api/payments/virtual-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total_amount,
          customerName: order.customer?.name || '고객',
          customerPhone: order.customer?.phone || '',
          bank: '88',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '가상계좌 발급 실패');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || '가상계좌 발급 실패');

      router.push(`/order/complete?orderId=${order.id}`);
    } catch (err: any) {
      setError(err.message || '가상계좌 발급 중 오류가 발생했습니다.');
      setIsProcessingVbank(false);
    }
  };

  const handleCardPayment = async () => {
    if (!order) return;
    setIsProcessingCard(true);
    setError(null);

    try {
      const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

      if (!clientKey) throw new Error('결제 시스템 설정 오류');

      const tossPayments = await loadTossPayments(clientKey);

      await tossPayments.requestPayment('카드', {
        amount: order.total_amount,
        orderId: `CARD_${order.id}_${Date.now()}`,
        orderName: `올때만두 - ${order.apt_name || '픽업주문'}`,
        customerName: order.customer?.name || '고객',
        successUrl: `${window.location.origin}/order/success`,
        failUrl: `${window.location.origin}/order/fail?orderId=${order.id}`,
      });
    } catch (err: any) {
      if (err.code === 'USER_CANCEL') {
        setError('결제를 취소하셨습니다.');
      } else {
        setError(err.message || '카드 결제 중 오류가 발생했습니다.');
      }
      setIsProcessingCard(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-50 to-orange-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">오류가 발생했습니다</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      <header className="bg-brand text-white p-6 text-center">
        <CheckCircle className="mx-auto h-12 w-12 mb-3" />
        <h1 className="text-xl font-bold mb-1">주문이 접수되었습니다</h1>
        <p className="text-orange-100 text-sm">결제 방법을 선택해주세요</p>
      </header>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-4">
        {/* 주문 요약 */}
        {order && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">주문자</span>
                  <span className="font-medium">{order.customer?.name}</span>
                </div>
                {order.is_pickup ? (
                  <div className="flex justify-between">
                    <span className="text-gray-500">수령방법</span>
                    <span className="font-medium text-purple-600">매장 픽업</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">배송지</span>
                    <span className="font-medium">{order.apt_name} {order.dong}동 {order.ho}호</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-bold">
                  <span>결제 금액</span>
                  <span className="text-lg text-brand">{order.total_amount?.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 결제 수단 선택 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 px-1">결제 방법 선택</h2>

          {/* 카드 결제 */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={!isProcessingCard && !isProcessingVbank ? handleCardPayment : undefined}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <CreditCard className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-base mb-1">신용/체크카드 결제</h3>
                  <p className="text-sm text-blue-700">카드로 즉시 결제 완료</p>
                  <p className="text-xs text-gray-500 mt-1">모든 카드 사용 가능</p>
                </div>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); handleCardPayment(); }}
                disabled={isProcessingCard || isProcessingVbank}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isProcessingCard ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    결제창 열기...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    카드로 결제하기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 가상계좌 입금 */}
          <Card className="border-2 border-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
                onClick={!isProcessingVbank && !isProcessingCard ? handleVirtualAccount : undefined}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 p-3 rounded-full">
                  <Landmark className="h-7 w-7 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 text-base mb-1">계좌이체 (가상계좌)</h3>
                  <p className="text-sm text-amber-700">발급된 계좌로 입금</p>
                  <p className="text-xs text-gray-500 mt-1">입금 확인 후 주문 확정</p>
                </div>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); handleVirtualAccount(); }}
                disabled={isProcessingVbank || isProcessingCard}
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                {isProcessingVbank ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    계좌 발급 중...
                  </>
                ) : (
                  <>
                    <Landmark className="mr-2 h-5 w-5" />
                    가상계좌로 입금하기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 결제 안내 */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>토스페이먼츠 인증 PG사를 통한 안전한 결제</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>SSL 암호화로 결제 정보가 안전하게 보호됩니다</span>
              </div>
              <p className="text-gray-500 pt-1">
                결제 관련 문의: {STORE_INFO.phone} ({STORE_INFO.businessHours})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </main>
  );
}
