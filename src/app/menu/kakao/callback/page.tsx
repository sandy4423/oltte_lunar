'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

/** 카카오 로그인에서 돌아오는 곳. 코드를 세션으로 바꾸고 서버에 알린 뒤 주문서 2단계로 돌려보낸다. 실패해도 같은 곳으로(문자 인증으로 이어짐) */
export default function KakaoCallback() {
  useEffect(() => {
    const back = () => window.location.replace('/menu/checkout?step=phone');
    (async () => {
      try {
        const code = new URL(window.location.href).searchParams.get('code');
        if (!code) return back();
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { flowType: 'pkce', storageKey: 'jache-kakao-auth', detectSessionInUrl: false },
        });
        const { data, error } = await sb.auth.exchangeCodeForSession(code);
        const accessToken = data?.session?.access_token;
        if (error || !accessToken) {
          // 왜 실패했는지 서버 로그에 남긴다(번호·토큰 없음)
          await fetch('/api/menu/kakao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ clientError: String(error?.message || 'no session').slice(0, 200) }) }).catch(() => {});
          return back();
        }
        await fetch('/api/menu/kakao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ accessToken }),
        }).catch(() => {});
        await sb.auth.signOut({ scope: 'local' }).catch(() => {}); // 브라우저에 카카오 세션을 남기지 않는다
      } catch {
        /* 아래에서 돌아간다 */
      }
      back();
    })();
  }, []);
  return <div className="flex min-h-screen items-center justify-center text-zinc-400">…</div>;
}
