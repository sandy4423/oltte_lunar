import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 순환 재고실사(Cycle Counting) 기반 오늘의 점검 항목 계산
 *
 * 기준일(epoch): 2025-01-01
 * 오늘의 항목 조건: floor((today - epoch) / 1day) % check_interval_days == cycle_group
 */
const EPOCH = new Date('2025-01-01T00:00:00+09:00');

function getTodayIndex(): number {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const kstEpoch = new Date(EPOCH.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  kstNow.setHours(0, 0, 0, 0);
  kstEpoch.setHours(0, 0, 0, 0);
  return Math.floor((kstNow.getTime() - kstEpoch.getTime()) / (1000 * 60 * 60 * 24));
}

/** GET /api/admin/inventory — 전체 목록 + 오늘의 항목 목록 반환 */
export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayIndex = getTodayIndex();

  const todayItems = (data ?? []).filter(
    (item) => todayIndex % item.check_interval_days === item.cycle_group
  );

  return NextResponse.json(
    { items: data ?? [], todayItems, todayIndex },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

/** PATCH /api/admin/inventory — 수량+메모 업데이트 + 로그 기록 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, main_qty, detail_qty, memo, staff_name } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  // 1) inventory_items 업데이트
  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      main_qty: main_qty ?? null,
      detail_qty: detail_qty ?? null,
      last_memo: memo ?? null,
      last_checked_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) inventory_logs에 이력 INSERT
  if (data && staff_name) {
    await supabase.from('inventory_logs').insert({
      item_id: id,
      item_name: data.name,
      staff_name,
      main_qty: main_qty ?? null,
      detail_qty: detail_qty ?? null,
      unit: data.unit,
      detail_unit: data.detail_unit,
      memo: memo ?? null,
    });
  }

  return NextResponse.json({ item: data });
}
