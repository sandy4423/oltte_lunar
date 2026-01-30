/**
 * 결제 실패 페이지
 * 
 * 토스페이먼츠 결제창에서 failUrl로 리다이렉트 됩니다.
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  // orderId에서 실제 주문 ID 추출 (CARD_123_timestamp 형식)
  const actualOrderId = orderId ? orderId.split('_')[1] : null;

  const getErrorMessage = () => {
    if (code === 'USER_CANCEL') {
      return '결제를 취소하셨습니다.';
    }
    return message || '결제 중 오류가 발생했습니다.';
  };

  const handleRetry = () => {
    if (actualOrderId) {
      router.push(`/order/complete?orderId=${actualOrderId}`);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-50 to-orange-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4">결제 실패</h1>
          <p className="text-gray-600 mb-2">{getErrorMessage()}</p>
          
          {code && (
            <p className="text-sm text-gray-500 mb-6">
              오류 코드: {code}
            </p>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full"
            >
              {actualOrderId ? '주문 페이지로 돌아가기' : '홈으로 돌아가기'}
            </Button>

            <p className="text-xs text-gray-400">
              문의: 010-2592-4423
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
