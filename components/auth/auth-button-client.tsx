'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from './user-menu'
import type { CurrentProfile } from '@/lib/auth/get-user'

/**
 * Client Component 헤더에서 사용하는 AuthButton.
 *
 * 부모 페이지(`industry-dashboard.tsx`, `hegemony-map.tsx`)가 'use client' 이라
 * Server Component 인 `AuthButton` 을 직접 사용할 수 없어, Supabase Browser
 * 클라이언트로 세션을 직접 구독한다.
 *
 * - 비로그인: "로그인" 버튼
 * - 로그인: 아바타 드롭다운 (`UserMenu`)
 *
 * 세션 변경(로그아웃 등) 즉시 반영되도록 onAuthStateChange 구독.
 */
export function AuthButtonClient() {
  const [profile, setProfile] = useState<CurrentProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setProfile(null)
        setLoaded(true)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url, role')
        .eq('id', user.id)
        .single()

      if (cancelled) return
      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          name: data.name,
          avatarUrl: data.avatar_url,
          role: data.role === 'admin' ? 'admin' : 'user',
        })
      } else {
        setProfile({
          id: user.id,
          email: user.email ?? '',
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            null,
          avatarUrl:
            (user.user_metadata?.avatar_url as string | undefined) ?? null,
          role: 'user',
        })
      }
      setLoaded(true)
    }

    fetchProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null)
        setLoaded(true)
        return
      }
      // 세션이 갱신되면 profile 다시 로드
      fetchProfile()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (!loaded) {
    return (
      <div
        className="h-8 w-8 rounded-full bg-surface-2 animate-pulse"
        aria-hidden
      />
    )
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground border border-border-subtle transition-colors"
        aria-label="로그인 페이지로 이동"
      >
        <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        <span>로그인</span>
      </Link>
    )
  }

  return <UserMenu profile={profile} />
}
