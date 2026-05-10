'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { SectorKingLogo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { SearchTrigger } from '@/components/search-trigger'
import { HelpButton } from '@/components/onboarding/help-button'
import { ShareButton } from '@/components/share-button'
import { AuthButtonClient } from '@/components/auth/auth-button-client'
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
}

/**
 * 모든 페이지 공통 글로벌 헤더
 *
 * - 좌: 로고 + 사이트명 + (옵션) 부제
 * - 우: lastUpdated · Share · Search · Help · Theme · Auth
 * - 반응형 표준 패턴: flex flex-col sm:flex-row sm:items-center sm:justify-between
 * - sticky top-0 z-50, backdrop-blur 톤 일관
 */
export function GlobalTopBar({
  pageId,
  lastUpdated,
  shareTitle = 'Sector King - 투자 패권 지도',
  shareDescription = '산업별 섹터 시장 지배력 순위 시각화',
  extraActions,
  subtitle,
}: GlobalTopBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="홈으로">
              <SectorKingLogo size={40} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  Sector King
                </h1>
                {subtitle ? (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {subtitle}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    산업별 투자 패권 지도
                  </p>
                )}
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {lastUpdated && <UpdateTimestamp dateStr={lastUpdated} />}
            {extraActions}
            <ShareButton title={shareTitle} description={shareDescription} />
            <SearchTrigger />
            {pageId && <HelpButton pageId={pageId} />}
            <ThemeToggle />
            <AuthButtonClient />
          </div>
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
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
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
