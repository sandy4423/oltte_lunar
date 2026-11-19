/**
 * 자체앱: 이미 번호 인증을 마친 손님인지 (인증 쿠키 30분) — 결제 실패·취소로 주문서에 돌아왔을 때 인증을 다시 시키지 않으려고 (사장님 11-19 「결제 실패해서 돌아오면 번호인증 유지해」)
 * GET → { phone: '010…' } 또는 { phone: null }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionPhone } from '@/lib/orderAccess.server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({ phone: getSessionPhone(req) }, { headers: { 'Cache-Control': 'no-store' } });
}
