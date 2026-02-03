/**
 * Slack 알림 유틸리티
 * 
 * Incoming Webhooks를 사용하여 Slack으로 메시지를 전송합니다.
 * 공식 문서: https://api.slack.com/messaging/webhooks
 * 
 * 환경변수:
 * - SLACK_WEBHOOK_URL: Slack Incoming Webhook URL
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

export interface SlackMessage {
  text: string;
}

export interface SlackResult {
  success: boolean;
  error?: string;
}

/**
 * Slack 메시지 전송
 * 
 * @param text - 전송할 메시지 내용 (plain text)
 * @returns 전송 결과
 */
export async function sendSlackMessage(text: string): Promise<SlackResult> {
  try {
    // Webhook URL 확인 - 없으면 개발 모드로 동작
    if (!SLACK_WEBHOOK_URL) {
      console.log('========================================');
      console.log('[Slack 전송 - 개발 모드]');
      console.log('내용:', text);
      console.log('========================================');
      return {
        success: true,
      };
    }

    // Slack Incoming Webhook 호출
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    // Slack Webhook은 성공 시 'ok' 텍스트를 반환
    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Slack] API 응답 오류:', responseText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
      };
    }

    console.log('[Slack] 메시지 전송 성공');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Slack] 전송 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 신규 주문 알림 메시지 생성
 */
export function createOrderNotification(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  aptName: string;
  dong: string;
  ho: string;
  amount: number;
  deliveryDate: string;
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, amount, deliveryDate } = params;
  
  return `🔔 신규 주문

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
배송지: ${aptName} ${dong}동 ${ho}호
금액: ${amount.toLocaleString()}원
배송일: ${deliveryDate}`;
}

/**
 * 결제 완료 알림 메시지 생성
 */
export function createPaymentConfirmation(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  aptName: string;
  dong: string;
  ho: string;
  amount: number;
  deliveryDate: string;
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, amount, deliveryDate } = params;
  
  return `💰 결제 완료

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
배송지: ${aptName} ${dong}동 ${ho}호
금액: ${amount.toLocaleString()}원
배송일: ${deliveryDate}`;
}

/**
 * 에러 알림 메시지 생성
 */
export function createErrorAlert(params: {
  errorType: string;
  errorMessage: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  aptName?: string;
  timestamp: string;
}): string {
  const { errorType, errorMessage, orderId, customerName, customerPhone, aptName, timestamp } = params;
  
  let message = `🚨 시스템 에러 발생

에러 타입: ${errorType}
에러 메시지: ${errorMessage}
발생 시각: ${timestamp}`;

  if (orderId) message += `\n주문번호: ${orderId}`;
  if (customerName) message += `\n고객명: ${customerName}`;
  if (customerPhone) message += `\n연락처: ${customerPhone}`;
  if (aptName) message += `\n배송지: ${aptName}`;

  return message;
}
