/**
 * Supabase Admin 클라이언트 — service_role key 로 RLS 우회.
 *
 * 절대 클라이언트 컴포넌트나 클라이언트 번들에 포함되어선 안 된다.
 * `'server-only'` 가드를 통해 빌드 시점에 차단된다.
 *
 * 사용처:
 * - 관리자 콘솔의 server action
 * - 운영 cron / 시드 스크립트
 * - 신규 가입자 ADMIN_EMAILS 자동 부여 등 트리거 보완 작업
 *
 * 사용 예:
 *   import { createAdminClient } from '@/lib/supabase/admin'
 *   const admin = createAdminClient()
 *   await admin.from('profiles').update({ role: 'admin' }).eq('id', userId)
 *
 * 주의:
 * - SUPABASE_SERVICE_ROLE 환경변수에 service_role key 가 들어 있어야 한다.
 *   `NEXT_PUBLIC_` prefix 절대 금지.
 * - 본 모듈은 단일 진입점. 다른 곳에서 service_role key 를 직접 사용하지 말 것.
 */
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE

  if (!url || !serviceRole) {
    throw new Error(
      'Supabase admin 클라이언트 초기화 실패: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE 환경변수 누락'
    )
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
