/**
 * Slack 알림 유틸리티
 * 
 * Incoming Webhooks를 사용하여 Slack으로 메시지를 전송합니다.
 * 공식 문서: https://api.slack.com/messaging/webhooks
 * 
 * 환경변수:
 * - SLACK_WEBHOOK_URL: Slack Incoming Webhook URL
 */

import { getProductBySku } from '@/lib/constants';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

/** 주문 상품 아이템 (슬랙 알림용) */
export interface SlackOrderItem {
  sku: string;
  qty: number;
}

/**
 * 주문 상품 목록을 슬랙 메시지용 문자열로 포맷팅
 */
function formatOrderItems(items: SlackOrderItem[]): string {
  if (!items || items.length === 0) return '';
  
  const lines = items.map(item => {
    const product = getProductBySku(item.sku);
    const name = product ? product.name : item.sku;
    return `- ${name} x ${item.qty}`;
  });
  
  return `\n\n[주문상품]\n${lines.join('\n')}`;
}

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
  isPickup?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  orderItems?: SlackOrderItem[];
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, amount, deliveryDate, isPickup, pickupDate, pickupTime, orderItems } = params;
  
  const deliveryInfo = isPickup 
    ? `픽업: ${pickupDate || ''} ${pickupTime || ''}`
    : `배송지: ${aptName} ${dong}동 ${ho}호`;
  
  const itemsText = orderItems ? formatOrderItems(orderItems) : '';
  
  return `🔔 신규 주문

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
${deliveryInfo}
금액: ${amount.toLocaleString()}원
${isPickup ? '픽업일' : '배송일'}: ${deliveryDate}${itemsText}`;
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
  isPickup?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  orderItems?: SlackOrderItem[];
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, amount, deliveryDate, isPickup, pickupDate, pickupTime, orderItems } = params;
  
  const deliveryInfo = isPickup 
    ? `픽업: ${pickupDate || ''} ${pickupTime || ''}`
    : `배송지: ${aptName} ${dong}동 ${ho}호`;
  
  const itemsText = orderItems ? formatOrderItems(orderItems) : '';
  
  return `💰 결제 완료

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
${deliveryInfo}
금액: ${amount.toLocaleString()}원
${isPickup ? '픽업일' : '배송일'}: ${deliveryDate}${itemsText}`;
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

/**
 * 취소 요청 알림 메시지 생성
 */
export function createCancelRequestNotification(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  aptName: string;
  dong: string;
  ho: string;
  totalAmount: number;
  refundAmount: number;
  refundReason: string;
  isPickup?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  orderItems?: SlackOrderItem[];
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, totalAmount, refundAmount, refundReason, isPickup, pickupDate, pickupTime, orderItems } = params;
  
  const deliveryInfo = isPickup 
    ? `픽업: ${pickupDate || ''} ${pickupTime || ''}`
    : `배송지: ${aptName} ${dong}동 ${ho}호`;
  
  const itemsText = orderItems ? formatOrderItems(orderItems) : '';
  
  return `🟡 취소 요청 (계좌정보 대기)

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
${deliveryInfo}
주문금액: ${totalAmount.toLocaleString()}원
환불금액: ${refundAmount.toLocaleString()}원
취소사유: ${refundReason}${itemsText}

고객에게 계좌입력 링크를 발송했습니다.`;
}

/**
 * 범용 Slack 알림 전송 (구조화된 필드 지원)
 * 
 * @param params - title과 fields 배열로 Slack 메시지를 구성
 * @returns 전송 결과
 */
export async function sendSlackAlert(params: {
  title: string;
  fields: { title: string; value: string }[];
}): Promise<SlackResult> {
  const { title, fields } = params;
  const fieldLines = fields.map(f => `${f.title}: ${f.value}`).join('\n');
  const text = `${title}\n\n${fieldLines}`;
  return sendSlackMessage(text);
}

/**
 * 환불 완료 알림 메시지 생성
 */
export function createRefundCompleteNotification(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  aptName: string;
  dong: string;
  ho: string;
  refundAmount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isPickup?: boolean;
  pickupDate?: string;
  pickupTime?: string;
  orderItems?: SlackOrderItem[];
}): string {
  const { orderId, customerName, customerPhone, aptName, dong, ho, refundAmount, bankName, accountNumber, accountHolder, isPickup, pickupDate, pickupTime, orderItems } = params;
  
  // 계좌번호 마스킹 (뒤 4자리만 표시)
  const maskedAccount = accountNumber.length > 4 
    ? '***' + accountNumber.slice(-4) 
    : accountNumber;
  
  const deliveryInfo = isPickup 
    ? `픽업: ${pickupDate || ''} ${pickupTime || ''}`
    : `배송지: ${aptName} ${dong}동 ${ho}호`;
  
  const itemsText = orderItems ? formatOrderItems(orderItems) : '';
  
  return `✅ 환불 완료

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
${deliveryInfo}
환불금액: ${refundAmount.toLocaleString()}원
환불계좌: ${bankName} ${maskedAccount} (${accountHolder})${itemsText}

토스페이먼츠를 통해 환불 처리되었습니다.`;
}

/**
 * 픽업시간 변경 Slack 알림 메시지 생성
 */
export function createPickupTimeChangeAlert(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  oldPickupDate: string;
  oldPickupTime: string;
  newPickupDate: string;
  newPickupTime: string;
}): string {
  const { orderId, customerName, customerPhone, oldPickupDate, oldPickupTime, newPickupDate, newPickupTime } = params;
  
  return `🔄 픽업시간 변경

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}

[변경 전]
${oldPickupDate} ${oldPickupTime}

[변경 후]
${newPickupDate} ${newPickupTime}

고객이 직접 변경했습니다.`;
}

/**
 * 픽업시간 회신 링크 발송 Slack 알림 메시지 생성
 */
export function createPickupTimeLinkSentAlert(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  link: string;
}): string {
  const { orderId, customerName, customerPhone, orderDate, deliveryDate, link } = params;
  
  return `🔗 픽업시간 선택 링크 전송

주문번호: ${orderId}
고객명: ${customerName}
연락처: ${customerPhone}
주문일: ${orderDate}
수령예정일: ${deliveryDate}

전송된 링크:
${link}

고객이 링크를 통해 픽업시간을 선택할 수 있습니다.`;
}
