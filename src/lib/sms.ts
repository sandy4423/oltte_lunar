/**
 * SMS 발송 유틸리티 (Solapi REST API 연동)
 * 
 * 공식 문서: https://developers.solapi.com/references/authentication/api-key
 * 
 * 환경변수:
 * - SOLAPI_API_KEY: Solapi API Key
 * - SOLAPI_API_SECRET: Solapi API Secret
 * - SOLAPI_SENDER_NUMBER: 발신번호 (예: 0328325012)
 */

import crypto from 'crypto';

const API_KEY = process.env.SOLAPI_API_KEY || '';
const API_SECRET = process.env.SOLAPI_API_SECRET || '';
const SENDER_NUMBER = process.env.SOLAPI_SENDER_NUMBER || '';
const API_BASE_URL = 'https://api.solapi.com';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * HMAC-SHA256 시그니처 생성
 */
function generateSignature(apiSecret: string, dateTime: string, salt: string): string {
  const data = dateTime + salt;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(data)
    .digest('hex');
}

/**
 * Authorization 헤더 생성
 */
function createAuthHeader(apiKey: string, apiSecret: string): string {
  const dateTime = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = generateSignature(apiSecret, dateTime, salt);
  
  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

/**
 * SMS 발송 함수
 * 
 * @param to - 수신자 전화번호 (하이픈 있어도 자동 제거)
 * @param text - 발송할 메시지 내용
 * @returns 발송 결과
 */
export async function sendSMS(to: string, text: string): Promise<SMSResult> {
  try {
    // 전화번호 정규화 (하이픈 및 공백 제거, 숫자만 남김)
    const normalizedPhone = to.replace(/[^0-9]/g, '');
    
    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      console.error('[SMS] Invalid phone number format:', to);
      return {
        success: false,
        error: `Invalid phone number format: ${to}`,
      };
    }

    // API 키 확인 - 없으면 개발 모드로 동작
    if (!API_KEY || !API_SECRET) {
      console.log('========================================');
      console.log('[SMS 발송 - 개발 모드]');
      console.log(`수신자: ${normalizedPhone}`);
      console.log(`발신자: ${SENDER_NUMBER}`);
      console.log(`내용: ${text}`);
      console.log('========================================');
      return {
        success: true,
        messageId: `dev_${Date.now()}`,
      };
    }

    // Solapi REST API 호출 (공식 문서 형식)
    const authHeader = createAuthHeader(API_KEY, API_SECRET);
    
    const messageData = {
      messages: [
        {
          to: normalizedPhone,
          from: SENDER_NUMBER,
          text: text,
        }
      ],
    };

    const response = await fetch(`${API_BASE_URL}/messages/v4/send-many/detail`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SMS] API 응답 오류:', result);
      return {
        success: false,
        error: result.errorMessage || `HTTP ${response.status}`,
      };
    }

    console.log('[SMS] 발송 성공:', JSON.stringify(result, null, 2));

    // messageId 반환
    const messageId = result.messageId || result.groupId || `sent_${Date.now()}`;

    return {
      success: true,
      messageId: messageId,
    };
  } catch (error) {
    console.error('[SMS] 발송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 대량 SMS 발송 함수
 */
export async function sendBulkSMS(
  recipients: string[],
  text: string
): Promise<{ total: number; success: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const phone of recipients) {
    const result = await sendSMS(phone, text);
    results.push(result);
    
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return {
    total: recipients.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

// ============================================
// SMS 템플릿 함수들
// ============================================

/**
 * 인증번호 SMS 생성
 */
export function createVerificationSMS(code: string): string {
  return `[올때만두] 인증번호는 [${code}]입니다. 5분 이내에 입력해주세요.`;
}

/**
 * 가상계좌 안내 SMS 생성
 */
export function createVirtualAccountSMS(params: {
  customerName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  dueDate: string;
}): string {
  const { customerName, bankName, accountNumber, amount, dueDate } = params;
  return `[올때만두] ${customerName}님, 주문이 접수되었습니다.

입금계좌: ${bankName} ${accountNumber}
금액: ${amount.toLocaleString()}원
마감: ${dueDate}까지

입금 확인 후 확정 문자가 발송됩니다.`;
}

/**
 * 입금 확인 SMS 생성
 */
export function createPaymentConfirmSMS(params: {
  customerName: string;
  deliveryDate: string;
  aptName: string;
}): string {
  const { customerName, deliveryDate, aptName } = params;
  return `[올때만두] ${customerName}님, 입금이 확인되었습니다!

배송예정: ${deliveryDate}
배송지: ${aptName}

배송 출발 시 다시 안내드릴게요.`;
}

/**
 * 배송 출발 SMS 생성
 */
export function createShippingSMS(params: {
  customerName: string;
  dong: string;
  ho: string;
}): string {
  const { customerName, dong, ho } = params;
  return `[올때만두] ${customerName}님, 배송이 시작되었습니다!

${dong}동 ${ho}호 문앞으로 배달됩니다.
비대면 배송이니 문앞을 확인해주세요!`;
}

/**
 * 배송 완료 SMS 생성
 */
export function createDeliveredSMS(params: {
  customerName: string;
  hasKimchiMandu: boolean;
}): string {
  const { customerName, hasKimchiMandu } = params;
  
  let message = `[올때만두] ${customerName}님, 배송 완료되었습니다!

문앞을 확인해주세요.
맛있는 설 보내세요!`;

  if (hasKimchiMandu) {
    message += `

※ 김치만두는 약간 매콤할 수 있습니다.`;
  }

  return message;
}
