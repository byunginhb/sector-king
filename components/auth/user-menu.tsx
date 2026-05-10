'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { LogOut, Shield, User as UserIcon, Star, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { CurrentProfile } from '@/lib/auth/get-user'

/**
 * 로그인 사용자 헤더 드롭다운.
 *
 * - 트리거: 아바타 (이미지 또는 첫 글자)
 * - 메뉴: 프로필(이메일) / 관리자 페이지(role=admin) / 로그아웃
 */
export function UserMenu({ profile }: { profile: CurrentProfile }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.refresh()
      router.push('/')
    } finally {
      setSigningOut(false)
    }
  }

  const initial = (profile.name?.[0] || profile.email?.[0] || '?').toUpperCase()
  const displayName = profile.name || profile.email
  const isAdmin = profile.role === 'admin'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="사용자 메뉴 열기"
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border-subtle bg-surface-2 hover:bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {initial}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </span>
          <span className="text-xs font-normal text-muted-foreground truncate">
            {profile.email}
          </span>
          {isAdmin && (
            <span
              className={cn(
                'mt-1 inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5',
                'bg-primary/15 text-primary',
                'text-[10px] font-medium uppercase tracking-wide'
              )}
            >
              <Shield className="h-3 w-3" aria-hidden />
              관리자
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/me" className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="h-4 w-4" aria-hidden />
            <span>내 페이지</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/me/watchlist"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Star className="h-4 w-4" aria-hidden />
            <span>워치리스트</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/me/settings"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4" aria-hidden />
            <span>설정</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link
              href="/admin"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Shield className="h-4 w-4" aria-hidden />
              <span>관리자 페이지</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            handleSignOut()
          }}
          disabled={signingOut}
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span>{signingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
