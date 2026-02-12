import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Supabase 환경 변수
 * .env.local 파일에 아래 값들을 설정해야 합니다:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase 클라이언트 (클라이언트 사이드 + 서버 사이드 공용)
 * 
 * Database 제네릭이 주입되어 있어서 아래처럼 자동완성이 됩니다:
 * - supabase.from('customers').select('*') → CustomerRow[]
 * - supabase.from('orders').insert({...}) → OrderInsert 타입 체크
 * 
 * @example
 * ```ts
 * const { data, error } = await supabase
 *   .from('orders')
 *   .select('*, customer:customers(*)')
 *   .eq('status', 'PAID');
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * 서버 전용 Supabase 클라이언트 (Service Role Key 사용)
 * 
 * RLS(Row Level Security)를 우회해야 하는 서버 액션에서 사용합니다.
 * - Webhook 처리
 * - Cron Job
 * - Admin API
 * 
 * ⚠️ 주의: 이 클라이언트는 절대 클라이언트 사이드에 노출되면 안 됩니다.
 * 
 * @example
 * ```ts
 * // API Route 또는 Server Action에서만 사용
 * const adminClient = createServerSupabaseClient();
 * await adminClient.from('orders').update({ status: 'PAID' }).eq('id', orderId);
 * ```
 */
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, init = {}) => {
        return fetch(url, {
          ...init,
          cache: 'no-store', // HTTP 캐시 무효화 - 항상 fresh data 가져오기
        });
      },
    },
  });
}
