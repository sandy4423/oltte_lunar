/**
 * 주문 접근 권한 — 서버 전용 모듈 (node:crypto 사용, 클라이언트에서 import 금지)
 *
 * 원칙 (plans/2026-10-28-만두주문-보안-근본수정.md):
 *  - 브라우저는 orders/customers/order_items 를 직접 만지지 않는다.
 *  - 서버가 「이 사람이 이 주문의 주인인가」를 먼저 확인한다.
 *
 * 두 가지 열쇠:
 *  1) 주문 열쇠(order token): 주문을 만든 브라우저가 받는다. HMAC(비밀값, "order:<id>").
 *     DB 에 저장하지 않는다(새 열 없음).
 *  2) 번호 인증 쿠키(phone session): 문자 인증·문자 링크 확인에 성공한 브라우저가 받는다.
 *     httpOnly + 서명 + 30분 만료. 내 주문·취소·수령시간·손님 정보는 이 쿠키의 전화번호만 믿는다.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 비밀값
// ============================================

/** 환경변수 ORDER_TOKEN_SECRET, 없으면 SERVICE_ROLE_KEY 에서 파생. 둘 다 없으면 예외(fail closed). */
export function orderTokenSecret(): string {
  const direct = process.env.ORDER_TOKEN_SECRET;
  if (direct && direct.length >= 16) return direct;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createHmac('sha256', serviceKey).update('oltte-order-token-v1').digest('hex');
  }
  throw new Error('ORDER_TOKEN_SECRET / SUPABASE_SERVICE_ROLE_KEY 가 없어 주문 열쇠를 만들 수 없습니다.');
}

function hmacBase64Url(label: string, data: string): string {
  return createHmac('sha256', orderTokenSecret()).update(`${label}${data}`).digest('base64url');
}

function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ============================================
// 주문 열쇠
// ============================================

export function makeOrderToken(orderId: number | string): string {
  return hmacBase64Url('order:', String(orderId)).slice(0, 32);
}

export function verifyOrderToken(orderId: number | string | null | undefined, token: string | null | undefined): boolean {
  try {
    if (orderId === null || orderId === undefined || !token) return false;
    if (typeof token !== 'string' || token.length !== 32) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;
    const id = String(orderId);
    if (!/^[0-9]+$/.test(id) && !/^[0-9a-fA-F-]{8,40}$/.test(id)) return false;
    return safeEqualStr(makeOrderToken(id), token);
  } catch {
    return false;
  }
}

// ============================================
// 번호 인증 쿠키
// ============================================

export const PHONE_SESSION_COOKIE = 'oltte_phone_session';
export const PHONE_SESSION_TTL_MS = 30 * 60 * 1000;

function signPhoneSession(payload: string): string {
  return hmacBase64Url('phone-session:', payload);
}

export function makePhoneSessionValue(phone: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ p: phone, e: now + PHONE_SESSION_TTL_MS }), 'utf8').toString('base64url');
  return `${payload}.${signPhoneSession(payload)}`;
}

export function parsePhoneSessionValue(value: string | undefined | null, now = Date.now()): string | null {
  try {
    if (!value) return null;
    const dot = value.indexOf('.');
    if (dot <= 0 || dot === value.length - 1) return null;
    const payload = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    if (!safeEqualStr(signPhoneSession(payload), sig)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.p !== 'string' || typeof parsed.e !== 'number') return null;
    if (now > parsed.e) return null;
    if (!/^01[0-9]{8,9}$/.test(parsed.p)) return null;
    return parsed.p;
  } catch {
    return null;
  }
}

export function setPhoneSession(res: NextResponse, phone: string): void {
  res.cookies.set(PHONE_SESSION_COOKIE, makePhoneSessionValue(phone), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(PHONE_SESSION_TTL_MS / 1000),
  });
}

export function getSessionPhone(req: NextRequest): string | null {
  return parsePhoneSessionValue(req.cookies.get(PHONE_SESSION_COOKIE)?.value);
}

export function clearPhoneSession(res: NextResponse): void {
  res.cookies.set(PHONE_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ============================================
// 만두 주문 판별 / 응답 필드 고르기
// ============================================

/** 만두 주문만 true. 과일 캠페인 주문(다른 앱, 같은 orders 표)은 apt_code 가 null. */
export function isManduOrder(order: { apt_code?: string | null } | null | undefined): boolean {
  return !!order && order.apt_code !== null && order.apt_code !== undefined;
}

export function maskPhone(phone: string | null | undefined): string {
  const d = String(phone ?? '').replace(/[^0-9]/g, '');
  if (d.length < 8) return '';
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

function maskNumber(n: string | null | undefined): string | null {
  if (!n) return null;
  const d = String(n);
  if (d.length <= 4) return '****';
  return `${'*'.repeat(d.length - 4)}${d.slice(-4)}`;
}

/**
 * 손님 화면에 돌려줄 필드만 고른다 (허용 목록 방식).
 * 제외: toss_secret, toss_payment_key, cash_receipt_key, refund_account_*, refund_bank_code,
 *       customer_id, portone_payment_id 등.
 * 전화번호는 가린다(010-****-1234), 현금영수증 번호는 뒤 4자리만.
 */
export function pickOrderPublicFields(order: any): Record<string, any> {
  const o = order || {};
  const customer = o.customer
    ? { name: o.customer.name ?? null, phone: maskPhone(o.customer.phone) }
    : null;
  const items = Array.isArray(o.order_items)
    ? o.order_items.map((it: any) => ({
        id: it.id,
        sku: it.sku,
        qty: it.qty,
        unit_price: it.unit_price,
        line_amount: it.line_amount,
        campaign_product: it.campaign_product ?? null,
        campaign_product_option: it.campaign_product_option ?? null,
      }))
    : undefined;

  const out: Record<string, any> = {
    id: o.id,
    status: o.status,
    apt_name: o.apt_name,
    dong: o.dong,
    ho: o.ho,
    delivery_date: o.delivery_date,
    cutoff_at: o.cutoff_at,
    total_qty: o.total_qty,
    total_amount: o.total_amount,
    payment_method: o.payment_method,
    vbank_num: o.vbank_num ?? null,
    vbank_bank: o.vbank_bank ?? null,
    vbank_holder: o.vbank_holder ?? null,
    vbank_expires_at: o.vbank_expires_at ?? null,
    paid_at: o.paid_at ?? null,
    cancel_reason: o.cancel_reason ?? null,
    cancelled_at: o.cancelled_at ?? null,
    is_pickup: o.is_pickup,
    pickup_discount: o.pickup_discount ?? 0,
    pickup_date: o.pickup_date ?? null,
    pickup_time: o.pickup_time ?? null,
    dangol_discount: o.dangol_discount ?? 0,
    source: o.source ?? null,
    refund_amount: o.refund_amount ?? null,
    refunded_at: o.refunded_at ?? null,
    cash_receipt_type: o.cash_receipt_type ?? null,
    cash_receipt_number: maskNumber(o.cash_receipt_number),
    cash_receipt_issued: o.cash_receipt_issued ?? false,
    cash_receipt_url: o.cash_receipt_url ?? null,
    is_hidden: o.is_hidden ?? false,
    created_at: o.created_at,
    updated_at: o.updated_at,
    customer,
  };
  if (items) out.order_items = items;
  return out;
}
