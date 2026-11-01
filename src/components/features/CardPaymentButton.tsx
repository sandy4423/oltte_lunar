/**
 * 카드 결제 버튼 컴포넌트
 * 
 * 가상계좌 발급 후 카드로 결제하고 싶을 때 사용합니다.
 * 토스페이먼츠 SDK V1을 사용하여 결제창을 엽니다.
 */

'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CardPaymentButtonProps {
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  /** 주문 열쇠 (결제 후 돌아오는 주소에 실어 보낸다) */
  token?: string | null;
}

export function CardPaymentButton({
  orderId,
  amount,
  orderName,
  customerName,
  token,
}: CardPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCardPayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 토스페이먼츠 SDK 동적 import
      const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

      if (!clientKey) {
        throw new Error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다.');
      }

      const tossPayments = await loadTossPayments(clientKey);

      // 결제창 열기 (카드 결제)
      await tossPayments.requestPayment('카드', {
        amount,
        orderId: `CARD_${orderId}_${Date.now()}`,
        orderName,
        customerName,
        // 토스가 돌려줄 때 자기 orderId(CARD_<번호>_<시각>)를 붙이므로 우리 쪽에서는 orderId 를 싣지 않는다 (같은 이름 중복 방지)
        successUrl: `${window.location.origin}/order/success?oid=${encodeURIComponent(String(orderId))}${token ? `&t=${encodeURIComponent(token)}` : ''}`,
        failUrl: `${window.location.origin}/order/fail?oid=${encodeURIComponent(String(orderId))}${token ? `&t=${encodeURIComponent(token)}` : ''}`,
      });

    } catch (err: any) {
      console.error('[CardPayment] Error:', err);
      
      if (err.code === 'USER_CANCEL') {
        setError('결제를 취소하셨습니다.');
      } else {
        setError(err.message || '카드 결제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <CreditCard className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-1">카드로 결제하기</h3>
            <p className="text-sm text-blue-700">
              가상계좌 대신 카드로 즉시 결제할 수 있습니다.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={handleCardPayment}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              결제창 열기...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              카드 결제하기
            </>
          )}
        </Button>

        <p className="mt-3 text-xs text-blue-600 text-center">
          💡 카드 결제 시 가상계좌 입금은 자동으로 취소됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
