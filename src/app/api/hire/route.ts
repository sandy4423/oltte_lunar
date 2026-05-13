import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const part = formData.get('part') as string;
  const startDate = formData.get('startDate') as string;
  const intro = (formData.get('intro') as string) || '';
  const photo = formData.get('photo') as File | null;

  if (!name || !phone || !part || !startDate) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  let photoUrl: string | null = null;

  if (photo && photo.size > 0) {
    const ext = photo.name.split('.').pop() || 'jpg';
    const fileName = `hire/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabase.from('hire_applications').insert({
    name,
    phone,
    part,
    start_date: startDate,
    positions: [part],
    intro,
    photo_url: photoUrl,
  });

  if (error) {
    console.error('hire insert error:', error);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
