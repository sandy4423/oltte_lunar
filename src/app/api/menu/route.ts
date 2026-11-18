import { NextResponse } from 'next/server';
import { fetchMenu } from '@/lib/tossplace';
import type { MenuResponse } from '@/lib/jache/types';

// 토스포스 메뉴판을 60초 캐시로 보여 준다. 키는 응답에 싣지 않는다.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await fetchMenu();
    const body: MenuResponse = { categories, fetchedAt: new Date().toISOString() };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[api/menu]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: '메뉴를 불러오지 못했어요' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
