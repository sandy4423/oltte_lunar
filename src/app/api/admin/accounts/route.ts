import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/** GET /api/admin/accounts — 전체 계정 목록 */
export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('staff_accounts')
    .select('id, name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}

/** POST /api/admin/accounts — 계정 추가 */
export async function POST(req: NextRequest) {
  const { name, password, role } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: '이름과 비밀번호를 입력하세요.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('staff_accounts')
    .insert({ name, password, role: role || 'staff' })
    .select('id, name, role, is_active, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 이름입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}

/** PATCH /api/admin/accounts — 계정 수정 */
export async function PATCH(req: NextRequest) {
  const { id, name, password, role, is_active } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (password !== undefined) updates.password = password;
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('staff_accounts')
    .update(updates)
    .eq('id', id)
    .select('id, name, role, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}

/** DELETE /api/admin/accounts — 계정 삭제 */
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('staff_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
