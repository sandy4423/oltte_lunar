import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/** GET /api/admin/inventory/logs?item_id=xxx — 특정 품목의 입력 이력 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item_id');

  if (!itemId) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('inventory_logs')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
