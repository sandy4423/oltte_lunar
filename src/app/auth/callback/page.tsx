'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(() => router.replace('/'))
        .catch((err) => {
          console.error('카카오 로그인 처리 실패:', err);
          router.replace('/?loginError=1');
        });
    } else {
      router.replace('/');
    }
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent mx-auto mb-4" />
        <p className="text-gray-600">카카오 로그인 처리 중...</p>
        <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</p>
      </div>
    </main>
  );
}
