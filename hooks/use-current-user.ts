/**
 * 가벼운 클라이언트 측 인증 상태 훅.
 *
 * - Supabase Browser 클라이언트로 user 조회 + auth state change 구독
 * - 깊은 user 객체가 아닌 로그인 여부만 빠르게 확인할 때 적합
 */
'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface UseCurrentUserResult {
  user: User | null
  isLoading: boolean
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      setUser(user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { user, isLoading }
}
