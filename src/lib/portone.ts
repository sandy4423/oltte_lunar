/**
 * PortOne V2 API 라이브러리
 * 
 * 환경변수 필요:
 * - PORTONE_API_SECRET: PortOne V2 API Secret
 * - PORTONE_WEBHOOK_SECRET: 웹훅 시그니처 검증용 Secret (선택)
 */

const PORTONE_API_BASE = 'https://api.portone.io';

/**
 * PortOne API 인증 헤더 생성
 */
function getAuthHeaders(): HeadersInit {
  const apiSecret = process.env.PORTONE_API_SECRET;
  
  if (!apiSecret) {
    throw new Error('PORTONE_API_SECRET is not defined');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `PortOne ${apiSecret}`,
  };
}

// ============================================
// API Response Types
// ============================================

export interface PortOnePayment {
  id: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIAL_CANCELLED';
  transactionId?: string;
  merchantId: string;
  storeId: string;
  method?: {
    type: string;
    virtualAccount?: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      expiresAt: string;
    };
    card?: {
      cardCompany: string;
      cardNumber: string;
    };
  };
  channel?: {
    pgProvider: string;
    pgMerchantId: string;
  };
  amount: {
    total: number;
    paid: number;
    cancelled: number;
  };
  orderName: string;
  currency: string;
  customer?: {
    name?: string;
    phoneNumber?: string;
  };
  paidAt?: string;
  cancelledAt?: string;
  failedAt?: string;
}

export interface PortOneError {
  type: string;
  message: string;
}

export interface GetPaymentResponse {
  payment?: PortOnePayment;
  error?: PortOneError;
}

export interface CancelResponse {
  cancellation?: {
    id: string;
    pgCancellationId: string;
    totalAmount: number;
    taxFreeAmount: number;
    vatAmount: number;
    reason: string;
    cancelledAt: string;
  };
  error?: PortOneError;
}

// ============================================
// API Functions
// ============================================

/**
 * 결제 정보 조회
 * @param paymentId - PortOne 결제 ID
 */
export async function getPayment(paymentId: string): Promise<GetPaymentResponse> {
  try {
    const response = await fetch(`${PORTONE_API_BASE}/payments/${paymentId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data as PortOneError };
    }

    return { payment: data as PortOnePayment };
  } catch (error) {
    console.error('[PortOne] getPayment error:', error);
    return {
      error: {
        type: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * 결제 금액 검증
 * 웹훅으로 들어온 결제 건이 DB의 주문 금액과 일치하는지 확인
 * 
 * @param paymentId - PortOne 결제 ID
 * @param expectedAmount - DB에 저장된 주문 금액
 * @returns 검증 결과
 */
export async function verifyPaymentAmount(
  paymentId: string,
  expectedAmount: number
): Promise<{ valid: boolean; payment?: PortOnePayment; error?: string }> {
  try {
    const { payment, error } = await getPayment(paymentId);

    if (error || !payment) {
      return {
        valid: false,
        error: error?.message || 'Failed to fetch payment',
      };
    }

    // 결제 상태 확인
    if (payment.status !== 'PAID') {
      return {
        valid: false,
        payment,
        error: `Invalid payment status: ${payment.status}`,
      };
    }

    // 금액 일치 확인
    if (payment.amount.paid !== expectedAmount) {
      return {
        valid: false,
        payment,
        error: `Amount mismatch: expected ${expectedAmount}, got ${payment.amount.paid}`,
      };
    }

    return { valid: true, payment };
  } catch (error) {
    console.error('[PortOne] verifyPaymentAmount error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 가상계좌 말소 (결제 취소)
 * 마감 시간 경과 후 미입금 주문의 가상계좌를 말소시켜 입금을 차단
 * 
 * @param paymentId - PortOne 결제 ID
 * @param reason - 취소 사유
 */
export async function cancelVirtualAccount(
  paymentId: string,
  reason: string = '입금 마감 시간 초과'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${PORTONE_API_BASE}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        reason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as PortOneError;
      // 이미 취소된 경우는 성공으로 처리
      if (error.type === 'ALREADY_CANCELLED') {
        console.log('[PortOne] Payment already cancelled:', paymentId);
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    console.log('[PortOne] Virtual account cancelled:', paymentId);
    return { success: true };
  } catch (error) {
    console.error('[PortOne] cancelVirtualAccount error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 웹훅 시그니처 검증 (PortOne V2)
 * 
 * PortOne V2 웹훅은 `webhook-id`, `webhook-timestamp`, `webhook-signature` 헤더를 사용
 * HMAC-SHA256으로 서명을 검증
 * 
 * @param payload - 웹훅 요청 body (raw string)
 * @param headers - 웹훅 요청 headers
 */
export async function verifyWebhookSignature(
  payload: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null
): Promise<{ valid: boolean; error?: string }> {
  try {
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

    // 웹훅 시크릿이 설정되지 않은 경우 검증 스킵 (개발 환경)
    if (!webhookSecret) {
      console.warn('[PortOne] PORTONE_WEBHOOK_SECRET not set, skipping signature verification');
      return { valid: true };
    }

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return { valid: false, error: 'Missing webhook headers' };
    }

    // 타임스탬프 검증 (5분 이내)
    const timestamp = parseInt(webhookTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return { valid: false, error: 'Webhook timestamp expired' };
    }

    // 시그니처 생성 및 비교
    const signedPayload = `${webhookId}.${webhookTimestamp}.${payload}`;
    
    // Web Crypto API 사용 (Edge Runtime 호환)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    // v1,{signature} 형식에서 signature 추출
    const receivedSignatures = webhookSignature.split(' ');
    const isValid = receivedSignatures.some(sig => {
      const [version, sigValue] = sig.split(',');
      return version === 'v1' && sigValue === expectedSignature;
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[PortOne] verifyWebhookSignature error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
