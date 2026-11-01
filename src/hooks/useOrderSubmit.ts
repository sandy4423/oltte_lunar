/**
 * 주문 제출 훅
 *
 * 전골 이벤트 픽업 주문 전용.
 * 주문은 서버(POST /api/orders/create)가 만든다 — 브라우저는 DB 를 직접 만지지 않는다.
 * 가격·합계·할인은 서버가 sku·수량으로 다시 계산한다(여기서 보내지 않음).
 * 성공하면 createdOrderId / finalAmount / accessToken 을 반환하고,
 * 호출 측에서 토스페이먼츠 카드 결제를 처리합니다.
 */

import { useState } from 'react';
import { getStoredSource } from '@/lib/sourceTracking';
import { rememberOrderToken } from '@/lib/orderToken';
import type { CartItem } from '@/types/order';

interface UseOrderSubmitParams {
  phone: string;
  name: string;
  personalInfoConsent: boolean;
  marketingOptIn: boolean;
  cart: CartItem[];
  // 아래 둘은 화면 표시용 값이라 서버로 보내지 않는다 (호출부 호환을 위해 남김)
  totalQty?: number;
  totalAmount?: number;
  pickupDate: string;
  pickupTime: string;
}

export function useOrderSubmit(params: UseOrderSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleSubmit = async (_isPickup?: boolean) => {
    const { phone, name, personalInfoConsent, marketingOptIn, cart, pickupDate, pickupTime } = params;

    if (!phone || !name || !pickupDate || !pickupTime) {
      setError('필수 정보를 모두 입력해주세요.');
      return;
    }
    if (!personalInfoConsent) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.filter((item) => item.qty > 0).map((item) => ({ sku: item.sku, qty: item.qty })),
          name,
          phone: phone.replace(/-/g, ''),
          pickupDate,
          pickupTime,
          personalInfoConsent: true,
          marketingOptIn,
          source: getStoredSource(),
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || '주문 생성 실패');
      }

      rememberOrderToken(result.orderId, result.accessToken);
      setAccessToken(result.accessToken);
      setFinalAmount(result.amount);
      setCreatedOrderId(result.orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다.';
      setError(msg);

      try {
        await fetch('/api/error-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorType: '전골 주문 제출 오류',
            errorMessage: msg,
            customerName: params.name,
            customerPhone: params.phone,
          }),
        });
      } catch { /* ignore */ }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    setError,
    handleSubmit,
    createdOrderId,
    finalAmount,
    accessToken,
  };
}
