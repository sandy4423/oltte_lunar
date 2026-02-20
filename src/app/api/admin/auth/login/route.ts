import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { name, password } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: '이름과 비밀번호를 입력하세요.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('staff_accounts')
    .select('id, name, role, is_active')
    .eq('name', name)
    .eq('password', password)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '이름 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  if (!data.is_active) {
    return NextResponse.json({ error: '비활성화된 계정입니다.' }, { status: 403 });
  }

  return NextResponse.json({
    user: { id: data.id, name: data.name, role: data.role },
  });
}
