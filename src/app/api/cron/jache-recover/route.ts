/** 자체앱 멈춘 주문 되살피기 — GET /api/cron/jache-recover (5분마다, vercel.json). 내용은 src/lib/jache/recover.server.ts */
import { NextRequest, NextResponse } from 'next/server';
import { recoverJacheOrders } from '@/lib/jache/recover.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await recoverJacheOrders());
}
