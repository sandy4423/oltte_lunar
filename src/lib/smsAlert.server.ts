/**
 * 문자 발송 + 실패 시 슬랙 알림 (서버 전용)
 *
 * sendSMS 는 실패해도 예외를 던지지 않고 {success:false} 를 돌려주므로
 * 호출부가 결과를 안 보면 조용히 실패한다 (카드 결제 문자가 2월부터 조용히 실패했음).
 * 이 함수는 예외·{success:false} 둘 다 슬랙 에러 알림으로 남긴다. 비밀값은 싣지 않는다.
 */

import { sendSMS } from '@/lib/sms';
import { sendSlackMessage, createErrorAlert } from '@/lib/slack';

export async function sendSMSWithAlert(
  to: string,
  text: string,
  ctx: { errorType: string; orderId?: string | number; customerName?: string; customerPhone?: string; aptName?: string }
): Promise<boolean> {
  let reason: string | null = null;
  try {
    const result = await sendSMS(to, text);
    if (!result?.success) reason = result?.error || '문자 발송 실패 (사유 없음)';
  } catch (e) {
    reason = e instanceof Error ? e.message : String(e);
  }
  if (reason === null) return true;

  console.error(`[SMS] ${ctx.errorType}:`, reason);
  await sendSlackMessage(
    createErrorAlert({
      errorType: ctx.errorType,
      errorMessage: reason,
      orderId: ctx.orderId !== undefined ? String(ctx.orderId) : undefined,
      customerName: ctx.customerName,
      customerPhone: ctx.customerPhone,
      aptName: ctx.aptName,
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    })
  ).catch((e) => console.error('[Error Alert]', e));
  return false;
}
