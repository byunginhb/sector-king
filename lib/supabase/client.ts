/**
 * Supabase Browser 클라이언트.
 *
 * 사용처: Client Component(`'use client'`) 내 인증 액션
 *  - 로그인 트리거 (`signInWithOAuth`)
 *  - 로그아웃 (`signOut`)
 *  - 세션 변경 구독 (`auth.onAuthStateChange`)
 *
 * 사용 예:
 *   'use client'
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 *
 * 주의: 데이터 조회는 가능한 한 Server Component 에서 수행. 클라이언트는
 * 인증 액션 + 가벼운 mutation 위주.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
