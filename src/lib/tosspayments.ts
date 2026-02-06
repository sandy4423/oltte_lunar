/**
 * 토스페이먼츠 V1 API 라이브러리
 * 
 * 서버에서 토스페이먼츠 API를 호출하기 위한 유틸리티 함수들
 */

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

/**
 * Basic 인증 헤더 생성
 */
function getAuthHeaders(): HeadersInit {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY is not defined');
  }
  
  // 시크릿 키 뒤에 ':' 추가하고 base64 인코딩
  const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');
  
  return {
    'Authorization': `Basic ${encodedKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 가상계좌 발급 요청
 * 
 * @param params 가상계좌 발급 파라미터
 * @returns Payment 객체 (virtualAccount 포함)
 */
export async function issueVirtualAccount(params: {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  bank: string;
  validHours?: number;
  dueDate?: string;
  customerMobilePhone?: string;
  customerEmail?: string;
  taxFreeAmount?: number;
  cashReceipt?: {
    type: '소득공제' | '지출증빙';
    registrationNumber?: string;
  };
}) {
  try {
    const response = await fetch(`${TOSS_API_BASE}/virtual-accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '가상계좌 발급 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Virtual account issue error:', error);
    throw error;
  }
}

/**
 * 결제 조회 (paymentKey로)
 * 
 * @param paymentKey 결제 키
 * @returns Payment 객체
 */
export async function getPayment(paymentKey: string) {
  try {
    const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '결제 조회 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Payment query error:', error);
    throw error;
  }
}

/**
 * 결제 조회 (orderId로)
 * 
 * @param orderId 주문 ID
 * @returns Payment 객체
 */
export async function getPaymentByOrderId(orderId: string) {
  try {
    const response = await fetch(`${TOSS_API_BASE}/payments/orders/${orderId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '결제 조회 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Payment query by orderId error:', error);
    throw error;
  }
}

/**
 * 결제 승인 (카드 결제용)
 * 
 * @param params 결제 승인 파라미터
 * @returns Payment 객체
 */
export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  try {
    const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '결제 승인 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Payment confirmation error:', error);
    throw error;
  }
}

/**
 * 결제 취소
 * 
 * @param paymentKey 결제 키
 * @param cancelReason 취소 사유
 * @param cancelAmount 취소 금액 (부분 취소 시)
 * @param refundReceiveAccount 환불 계좌 (가상계좌용)
 * @returns 취소된 Payment 객체
 */
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number,
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  }
) {
  try {
    const body: any = { cancelReason };
    
    if (cancelAmount !== undefined) {
      body.cancelAmount = cancelAmount;
    }
    
    if (refundReceiveAccount) {
      body.refundReceiveAccount = refundReceiveAccount;
    }

    const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '결제 취소 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Payment cancellation error:', error);
    throw error;
  }
}

/**
 * 웹훅 secret 검증
 * 
 * @param webhookSecret 웹훅에서 받은 secret 값
 * @param savedSecret DB에 저장된 secret 값
 * @returns 검증 성공 여부
 */
export function verifyWebhookSecret(webhookSecret: string, savedSecret: string): boolean {
  return webhookSecret === savedSecret;
}

/**
 * 현금영수증 발급
 * 
 * @param params 현금영수증 발급 파라미터
 * @returns CashReceipt 객체
 */
export async function issueCashReceipt(params: {
  orderId: string;
  amount: number;
  orderName: string;
  customerName?: string;
  type: '소득공제' | '지출증빙';
  customerIdentityNumber: string;
  taxFreeAmount?: number;
}) {
  try {
    const response = await fetch(`${TOSS_API_BASE}/cash-receipts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '현금영수증 발급 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Toss] Cash receipt issue error:', error);
    throw error;
  }
}

/**
 * 은행 코드를 은행 이름으로 변환
 */
export function getBankName(bankCode: string): string {
  const bankNames: Record<string, string> = {
    '02': '산업은행',
    '03': '기업은행',
    '04': '국민은행',
    '05': '외환은행',
    '07': '수협은행',
    '11': '농협은행',
    '12': '농협회원조합',
    '20': '우리은행',
    '23': 'SC제일은행',
    '27': '한국씨티은행',
    '31': '대구은행',
    '32': '부산은행',
    '34': '광주은행',
    '35': '제주은행',
    '37': '전북은행',
    '39': '경남은행',
    '45': '새마을금고',
    '48': '신협',
    '50': '상호저축은행',
    '64': '산림조합',
    '71': '우체국',
    '81': '하나은행',
    '88': '신한은행',
    '89': '케이뱅크',
    '90': '카카오뱅크',
    '92': '토스뱅크',
  };
  
  return bankNames[bankCode] || '기타은행';
}
