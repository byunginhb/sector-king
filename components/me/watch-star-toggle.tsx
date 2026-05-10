/**
 * 별 토글 — 산업/섹터/티커 카드에 끼워 넣을 수 있는 워치리스트 별 버튼.
 *
 * - 비로그인 클릭 → /login?redirect=현재경로
 * - 로그인 + 미추가 → 추가 (amber-500)
 * - 로그인 + 추가됨 → 제거 (muted-foreground)
 *
 * 부모 카드의 `<Link>` 와 중첩되지 않도록 호출부에서 stopPropagation 책임.
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWatchlist } from '@/hooks/me/use-watchlist'
import { cn } from '@/lib/utils'
import type { WatchlistItemType } from '@/drizzle/supabase-schema'

interface WatchStarToggleProps {
  itemType: WatchlistItemType
  itemKey: string
  displayName?: string | null
  size?: 'sm' | 'md'
  className?: string
  onToggle?: (added: boolean) => void
}

export function WatchStarToggle({
  itemType,
  itemKey,
  displayName,
  size = 'sm',
  className,
  onToggle,
}: WatchStarToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const { items, toggle, isLoading } = useWatchlist({ enabled: isAuthed === true })

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

  const watched = items.some(
    (i) => i.itemType === itemType && i.itemKey === itemKey
  )

  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  const buttonSize = size === 'md' ? 'h-9 w-9' : 'h-7 w-7'

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isAuthed === false) {
      const target = `/login?redirect=${encodeURIComponent(pathname || '/')}`
      router.push(target)
      return
    }
    if (isAuthed !== true || isLoading) return
    try {
      const result = await toggle({
        itemType,
        itemKey,
        displayName: displayName ?? null,
      })
      onToggle?.(result.added)
    } catch (err) {
      console.error('워치리스트 토글 실패', err)
    }
  }

  const label = watched
    ? `${displayName ?? itemKey} 워치리스트에서 제거`
    : `${displayName ?? itemKey} 워치리스트에 추가`

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={watched}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md border transition-colors',
        'border-border-subtle bg-surface-1 hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        buttonSize,
        className
      )}
    >
      <Star
        className={cn(
          sizeClass,
          watched
            ? 'text-primary fill-primary'
            : 'text-muted-foreground'
        )}
        aria-hidden
      />
    </button>
  )
}
