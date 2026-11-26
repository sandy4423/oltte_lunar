/**
 * 자체앱 결제 승인 — POST /api/menu/pay/confirm
 * Body: { orderId, paymentKey, amount, t }  (결제창 successUrl 에서 받은 값 + 주문 열쇠)
 * ① 우리 주문 금액과 대조 ② 토스페이먼츠 승인 ③ PAID ④ 토스포스 주문 생성. 새로고침·중복 호출에도 한 번만 처리.
 */
import { NextRequest, NextResponse } from 'next/server';
import { paymentsEnabled, tossKeys } from '@/lib/jache/config.server';
import { orderStore, verifyOrderTokenFor, isOrderId } from '@/lib/jache/orderStore.server';
import { confirmTossPayment, sendToPos } from '@/lib/jache/checkout.server';
import { notifyOrder } from '@/lib/alimtalk';
import { secondOrderStillOpen } from '@/lib/jache/secondOrder.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const res = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  if (!paymentsEnabled()) return res({ success: false, error: '결제는 준비 중이에요' }, 503);
  const keys = tossKeys();
  if (!keys) return res({ success: false, error: '결제는 준비 중이에요' }, 503);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return res({ success: false, error: '요청 형식이 올바르지 않아요' }, 400);
  }
  const { orderId, paymentKey, amount, t } = body ?? {};
  if (!isOrderId(orderId) || !verifyOrderTokenFor(orderId, t)) return res({ success: false, error: '주문을 찾을 수 없어요' }, 404);
  if (typeof paymentKey !== 'string' || paymentKey.length < 4 || paymentKey.length > 200) return res({ success: false, error: '결제 정보가 올바르지 않아요' }, 400);
  if (typeof amount !== 'number' || !Number.isInteger(amount)) return res({ success: false, error: '결제 정보가 올바르지 않아요' }, 400);

  const store = orderStore();
  const order = await store.get(orderId);
  if (!order) return res({ success: false, error: '주문을 찾을 수 없어요' }, 404);

  // 이미 처리된 주문: 결과만 돌려준다 (PAID 에서 멈춘 주문은 포스 전송을 이어서)
  if (order.status !== 'PENDING') {
    if (order.tossPaymentKey && order.tossPaymentKey !== paymentKey) return res({ success: false, error: '이미 결제된 주문이에요' }, 409);
    const cur = order.status === 'PAID' ? await sendToPos(orderId) : order;
    // PAID 에서 멈췄다가 이어서 POS_OK 가 된 경우도 접수 알림톡 (한 번만 — 기록 표가 막아 줌)
    if (order.status === 'PAID' && cur?.status === 'POS_OK') await notifyOrder('received', cur);
    return res({ success: true, status: cur?.status ?? order.status });
  }

  // 만든 지 30분 넘은 주문은 결제하지 않는다 — 할인 기간·영업일이 지난 뒤 결제되는 것 방지(11-19 점검)
  if (Date.now() - Date.parse(order.createdAt) > 30 * 60 * 1000) return res({ success: false, error: '주문 시간이 지났어요. 다시 주문해 주세요' }, 410);

  if (order.totalAmount !== amount) {
    console.error('[jache] amount mismatch', { orderId, expected: order.totalAmount, received: amount });
    return res({ success: false, error: '결제 금액이 맞지 않아요' }, 400);
  }

  // 2번째 주문 할인이 든 주문: 승인 직전에 다시 확인 — 그 사이 같은 번호의 다른 주문이 먼저 결제돼 이미 썼으면 결제 전에 막는다(돈은 안 나감)
  if (!(await secondOrderStillOpen(order))) return res({ success: false, error: '2번째 주문 할인을 이미 썼어요. 다시 주문해 주세요' }, 409);

  const c = await confirmTossPayment(keys, { paymentKey, orderId, amount });
  if (!c.ok) return res({ success: false, error: c.error }, 402);

  const paid = await store.update(orderId, { status: 'PAID', tossPaymentKey: paymentKey, paidAt: c.approvedAt }, ['PENDING']);
  if (!paid) {
    // 동시에 들어온 다른 호출이 먼저 처리함
    const cur = await store.get(orderId);
    return res({ success: true, status: cur?.status ?? 'PAID' });
  }

  const after = await sendToPos(orderId);
  // 접수 알림: 문자는 보내지 않는다(사장님 11-19). 11-26 사장님 승인으로 알림톡만 — 포스에 들어간(POS_OK) 주문만, 문자 대체 없음
  if (after?.status === 'POS_OK') await notifyOrder('received', after);
  return res({ success: true, status: after?.status ?? 'PAID', simulated: c.simulated });
}
