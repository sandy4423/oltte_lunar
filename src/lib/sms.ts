/**
 * SMS 발송 유틸리티
 * 
 * 현재는 콘솔 로그로 대체되어 있습니다.
 * 실제 연동 시 알리고, NHN Cloud, 네이버 클라우드 등의 API로 교체하세요.
 * 
 * 환경변수 (실제 연동 시 필요):
 * - SMS_API_KEY
 * - SMS_USER_ID
 * - SMS_SENDER_NUMBER
 */

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS 발송 함수
 * 
 * @param to - 수신자 전화번호 (01012345678 형식)
 * @param message - 발송할 메시지 내용
 * @returns 발송 결과
 * 
 * @example
 * ```ts
 * await sendSMS('01012345678', '[올때만두] 입금이 확인되었습니다.');
 * ```
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = to.replace(/-/g, '');
    
    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return {
        success: false,
        error: `Invalid phone number format: ${to}`,
      };
    }

    // TODO: 실제 SMS API 연동
    // 현재는 콘솔 로그로 대체
    console.log('========================================');
    console.log('[SMS 발송]');
    console.log(`수신자: ${normalizedPhone}`);
    console.log(`내용: ${message}`);
    console.log('========================================');

    // 개발 환경에서는 항상 성공으로 처리
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
    };
  } catch (error) {
    console.error('[SMS] sendSMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 대량 SMS 발송 함수
 * 
 * @param recipients - 수신자 목록 (전화번호 배열)
 * @param message - 발송할 메시지 내용
 * @returns 발송 결과 배열
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{ total: number; success: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const phone of recipients) {
    const result = await sendSMS(phone, message);
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
// SMS 템플릿 함수들 (PRD 7. SMS 발송 정책 기반)
// ============================================

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

💰 입금 계좌: ${bankName} ${accountNumber}
💵 금액: ${amount.toLocaleString()}원
⏰ 마감: ${dueDate}까지

입금 확인 후 자동으로 확정 문자가 발송됩니다.`;
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
  return `[올때만두] ${customerName}님, 입금이 확인되었습니다! ✅

📦 배송예정: ${deliveryDate}
📍 ${aptName}

배송 출발 시 다시 안내드릴게요. 감사합니다! 🥟`;
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
  return `[올때만두] ${customerName}님, 배송이 시작되었습니다! 🚗

📍 ${dong}동 ${ho}호 문앞으로 배달됩니다.
비대면 배송이니 문앞을 확인해주세요!`;
}

/**
 * 배송 완료 SMS 생성
 * PRD: 김치만두 포함 시 "속 쓰림 주의" 멘트 추가
 */
export function createDeliveredSMS(params: {
  customerName: string;
  hasKimchiMandu: boolean;
}): string {
  const { customerName, hasKimchiMandu } = params;
  
  let message = `[올때만두] ${customerName}님, 배송 완료되었습니다! 🥟✨

문앞을 확인해주세요.
맛있는 설 보내세요! 새해 복 많이 받으세요! 🎊`;

  if (hasKimchiMandu) {
    message += `

💡 김치만두는 약간 매콤할 수 있으니, 속이 약하신 분들은 참고해주세요!`;
  }

  return message;
}
