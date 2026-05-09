/**
 * Server Component / Route Handler 용 인증 헬퍼.
 *
 * `getCurrentUser()` — auth.users 의 user 만 (가벼움)
 * `getCurrentProfile()` — profiles 행 + role 까지 조회
 *
 * 사용 예:
 *   // app/some/page.tsx
 *   const profile = await getCurrentProfile()
 *   if (profile?.role === 'admin') { ... }
 *
 * 주의: RLS 가 적용된 `profiles_self_select` 정책에 따라 본인 행만 반환.
 * 미인증이면 null 반환.
 */
import { createClient } from '@/lib/supabase/server'

export type CurrentProfile = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: 'user' | 'admin'
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    // 트리거가 아직 실행되지 않은 케이스 등 — auth 사용자 정보로 폴백
    return {
      id: user.id,
      email: user.email ?? '',
      name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      role: 'user',
    }
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatar_url,
    role: data.role === 'admin' ? 'admin' : 'user',
  }
}
