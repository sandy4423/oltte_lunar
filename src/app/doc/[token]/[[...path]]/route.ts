/**
 * 비공개 문서 보여주기 (2026-09-28) — olttefood.com/doc/<토큰>/...
 *
 * 세무사 제출용 매입 원본처럼 영수증 사진이 든 페이지를 olttefood.com 주소로 여는 통로.
 * ⛔ 이 레포는 GitHub 공개 저장소라 파일을 여기(public/)에 두지 않는다.
 *    파일은 Supabase 비공개 버킷 `shared-docs/<토큰>/` 에 있고, 여기서 서비스 키로 꺼내 준다.
 * 토큰(추측 불가 문자열)을 아는 사람만 볼 수 있다. 내리려면 버킷에서 그 폴더를 지우면 된다.
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BUCKET = 'shared-docs';
const TOKEN_RE = /^[a-z0-9-]{16,64}$/;
const PART_RE = /^[A-Za-z0-9._-]+$/;
const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; path?: string[] } }
) {
  const { token } = params;
  const parts = params.path ?? [];
  if (!TOKEN_RE.test(token) || parts.some((p) => !PART_RE.test(p) || p.startsWith('.'))) return notFound();

  // /doc/<토큰> 으로 들어오면 끝에 / 를 붙여 준다 (페이지 안의 상대 경로가 맞게)
  if (parts.length === 0 && !request.nextUrl.pathname.endsWith('/')) {
    return Response.redirect(new URL(`/doc/${token}/`, request.url), 308);
  }

  const file = parts.length ? parts.join('/') : 'index.html';
  const ext = file.split('.').pop()!.toLowerCase();
  const type = TYPES[ext];
  if (!type) return notFound();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.storage.from(BUCKET).download(`${token}/${file}`);
  if (error || !data) return notFound();

  return new Response(data, {
    headers: {
      'Content-Type': type,
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': ext === 'html' ? 'private, no-cache' : 'private, max-age=86400',
    },
  });
}
