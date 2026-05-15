'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { SectorKingLogo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { SearchTrigger } from '@/components/search-trigger'
import { HelpButton } from '@/components/onboarding/help-button'
import { ShareButton } from '@/components/share-button'
import { AuthButtonClient } from '@/components/auth/auth-button-client'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PageId } from '@/components/onboarding/tour-steps'

interface GlobalTopBarProps {
  /** 페이지별 도움말 키 */
  pageId?: PageId
  /** 데이터 최신 시각 (ISO date string) */
  lastUpdated?: string | null
  /** 공유 카드 타이틀 */
  shareTitle?: string
  /** 공유 카드 설명 */
  shareDescription?: string
  /** 추가 상단 액션 (예: DateSelector). 우측 액션군 앞에 노출 */
  extraActions?: React.ReactNode
  /** 부제 (산업명 / 페이지명) — 로고 아래에 작게 노출 */
  subtitle?: React.ReactNode
  /** 모바일에서 햄버거 좌측에 노출되는 leading 액션 (예: 뒤로가기) */
  mobileLeading?: React.ReactNode
}

const MOBILE_BREAKPOINT = '(min-width: 640px)'

/**
 * 모든 페이지 공통 글로벌 헤더
 *
 * - 좌: 로고 + 사이트명 + (옵션) 부제
 * - 우(데스크탑): lastUpdated · extraActions · Share · Search · Help · Theme · Auth
 * - 우(모바일 ≤sm): 햄버거 → Sheet 패널에서 모든 액션 노출
 * - sticky top-0 z-50, backdrop-blur 톤 일관
 *
 * 데스크탑/모바일 분기는 mounted 후 matchMedia로 결정 — 두 트리가 동시에 마운트되어
 * useCurrentUser 등 훅이 중복 호출되는 문제를 방지한다. SSR/초기 hydration 동안에는
 * 데스크탑 트리를 기본으로 렌더하고, 마운트 직후 한쪽만 남긴다.
 */
export function GlobalTopBar({
  pageId,
  lastUpdated,
  shareTitle = 'Sector King - 투자 패권 지도',
  shareDescription = '산업별 섹터 시장 지배력 순위 시각화',
  extraActions,
  subtitle,
  mobileLeading,
}: GlobalTopBarProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(MOBILE_BREAKPOINT)
    const update = () => setIsDesktop(mql.matches)
    update()
    setMounted(true)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  // SSR + 마운트 직후에는 데스크탑 트리를 보이되 모바일 트리는 hidden 으로 두어
  // 같은 무거운 컴포넌트(AuthButtonClient 등)가 중복 마운트되지 않도록 한다.
  const showDesktop = !mounted || isDesktop
  const showMobile = mounted && !isDesktop

  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-sm border-b border-foreground/15">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-baseline gap-3 shrink-0 group" aria-label="홈으로">
              <SectorKingLogo size={32} className="shrink-0 self-center" />
              <div className="min-w-0">
                <h1 className="font-display text-xl md:text-2xl font-bold text-foreground leading-none tracking-tight">
                  Sector King
                </h1>
                {subtitle ? (
                  <p className="eyebrow mt-1.5 line-clamp-1">{subtitle}</p>
                ) : (
                  <p className="eyebrow mt-1.5">The Map of Capital</p>
                )}
              </div>
            </Link>
          </div>

          {/* 데스크탑 액션 — 마운트 전에는 기본 노출, 마운트 후 데스크탑에만 노출 */}
          {showDesktop && (
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {lastUpdated && <UpdateTimestamp dateStr={lastUpdated} />}
              {extraActions}
              <ShareButton title={shareTitle} description={shareDescription} />
              <SearchTrigger />
              {pageId && <HelpButton pageId={pageId} />}
              <ThemeToggle />
              <AuthButtonClient />
            </div>
          )}

          {/* 모바일 햄버거 — 마운트 후 모바일에서만 노출 */}
          {showMobile && (
            <div className="sm:hidden flex items-center gap-2">
              {mobileLeading}
              {lastUpdated && <UpdateTimestamp dateStr={lastUpdated} />}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="메뉴 열기"
                    aria-expanded={open}
                    aria-controls="global-mobile-menu"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border-subtle bg-surface-1 text-foreground hover:bg-surface-2 transition-colors"
                  >
                    <Menu className="h-5 w-5" aria-hidden />
                  </button>
                </SheetTrigger>
                <SheetContent
                  id="global-mobile-menu"
                  side="right"
                  className="flex flex-col gap-5"
                >
                  <SheetHeader>
                    <SheetTitle>메뉴</SheetTitle>
                    <SheetDescription className="sr-only">
                      검색·도구·계정 액션 모음
                    </SheetDescription>
                  </SheetHeader>

                  {extraActions && (
                    <section className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">필터</p>
                      <div className="flex flex-wrap items-center gap-2">{extraActions}</div>
                    </section>
                  )}

                  <section className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">도구</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <SearchTrigger />
                      {pageId && <HelpButton pageId={pageId} />}
                      <ShareButton title={shareTitle} description={shareDescription} />
                      <ThemeToggle />
                    </div>
                  </section>

                  <section className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">계정</p>
                    <div className="flex items-center">
                      <AuthButtonClient />
                    </div>
                  </section>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function UpdateTimestamp({ dateStr }: { dateStr: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className="text-xs text-muted-foreground tabular-nums">{dateStr} 기준</span>
  }

  const relative = formatRelativeTime(dateStr)
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  const isStale = diffDays >= 1

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        isStale ? 'text-warning' : 'text-muted-foreground'
      )}
    >
      {dateStr} · {relative}
    </span>
  )
}
