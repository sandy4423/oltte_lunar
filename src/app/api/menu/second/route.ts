/**
 * 2번째 주문 할인 대상인가 — GET /api/menu/second → { eligible }
 * 인증 쿠키 번호 또는 「번호 기억」(180일) 번호로만 판정한다. 번호를 모르면 eligible:false (화면은 아무것도 안 그림).
 * 화면 표시용일 뿐, 실제 금액은 주문 만들 때 서버가 다시 판정한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionPhone } from '@/lib/orderAccess.server';
import { getRemember } from '@/lib/jache/remember.server';
import { isTestMode } from '@/lib/jache/config.server';
import { secondOrderForPhone } from '@/lib/jache/secondOrder.server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const phone = getSessionPhone(req) ?? getRemember(req);
  const eligible = phone ? await secondOrderForPhone(phone, isTestMode()) : false;
  return NextResponse.json({ eligible }, { headers: { 'Cache-Control': 'no-store' } });
}
