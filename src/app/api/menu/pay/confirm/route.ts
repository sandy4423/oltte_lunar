/**
 * 자체앱 결제 승인 — POST /api/menu/pay/confirm
 * Body: { orderId, paymentKey, amount, t }  (결제창 successUrl 에서 받은 값 + 주문 열쇠)
 * ① 우리 주문 금액과 대조 ② 토스페이먼츠 승인 ③ PAID ④ 토스포스 주문 생성. 새로고침·중복 호출에도 한 번만 처리.
 */
import { NextRequest, NextResponse } from 'next/server';
import { paymentsEnabled, tossKeys } from '@/lib/jache/config.server';
import { orderStore, verifyOrderTokenFor, isOrderId } from '@/lib/jache/orderStore.server';
import { confirmTossPayment, sendToPos } from '@/lib/jache/checkout.server';

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
    return res({ success: true, status: cur?.status ?? order.status });
  }

  if (order.totalAmount !== amount) {
    console.error('[jache] amount mismatch', { orderId, expected: order.totalAmount, received: amount });
    return res({ success: false, error: '결제 금액이 맞지 않아요' }, 400);
  }

  const c = await confirmTossPayment(keys, { paymentKey, orderId, amount });
  if (!c.ok) return res({ success: false, error: c.error }, 402);

  const paid = await store.update(orderId, { status: 'PAID', tossPaymentKey: paymentKey, paidAt: c.approvedAt }, ['PENDING']);
  if (!paid) {
    // 동시에 들어온 다른 호출이 먼저 처리함
    const cur = await store.get(orderId);
    return res({ success: true, status: cur?.status ?? 'PAID' });
  }

  const after = await sendToPos(orderId);
  return res({ success: true, status: after?.status ?? 'PAID', simulated: c.simulated });
}
