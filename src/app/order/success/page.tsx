/**
 * 결제 성공 페이지
 * 
 * 토스페이먼츠 결제창에서 successUrl로 리다이렉트 됩니다.
 * 쿼리 파라미터로 paymentKey, orderId, amount를 받아 결제를 승인합니다.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        console.log('[Success] Confirming payment:', { paymentKey, orderId, amount });

        // 결제 승인 API 호출
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '결제 승인에 실패했습니다.');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '결제 승인에 실패했습니다.');
        }

        console.log('[Success] Payment confirmed:', data);

        // 주문 완료 페이지로 리다이렉트
        setTimeout(() => {
          router.push(`/order/complete?orderId=${data.orderId}`);
        }, 1500);

      } catch (err: any) {
        console.error('[Success] Error:', err);
        setError(err.message || '결제 처리 중 오류가 발생했습니다.');
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-50 to-orange-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-4">결제 승인 실패</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-emerald-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold mb-4">결제 처리 중...</h1>
          <p className="text-gray-600 mb-6">
            결제를 승인하고 있습니다.
            <br />
            잠시만 기다려주세요.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    </main>
  );
}
