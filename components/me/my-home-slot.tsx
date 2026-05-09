/**
 * 메인 화면의 "내 영역" 슬롯.
 *
 * - 로그인 → <MyWatchlistCard />
 * - 비로그인 → <LoginValuePromptCard />
 *
 * 클라이언트 측 인증 상태 구독 (createClient + onAuthStateChange).
 */
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MyWatchlistCard } from './my-watchlist-card'
import { LoginValuePromptCard } from './login-value-prompt-card'

export function MyHomeSlot() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      setIsAuthed(Boolean(user))
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(Boolean(session))
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (isAuthed === null) {
    // 깜빡임 방지를 위해 SSR 직후 짧게 placeholder
    return <div className="h-32 rounded-2xl border border-border-subtle bg-surface-1 animate-pulse" aria-hidden />
  }

  return isAuthed ? <MyWatchlistCard /> : <LoginValuePromptCard redirect="/" />
}
