'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Map, Wallet, BarChart3, LineChart } from 'lucide-react'
import { useIndustries } from '@/hooks/use-industries'
import { cn } from '@/lib/utils'

interface IndustryContextBarProps {
  industryId: string
  /** 우측 끝에 노출할 추가 액션 (RegionToggle, period 등) */
  rightActions?: React.ReactNode
}

interface TabDef {
  key: 'map' | 'flow' | 'price' | 'stats'
  label: string
  href: (id: string) => string
  /** active 매칭 정규화 함수 */
  match: (pathname: string, id: string) => boolean
  Icon: typeof Map
}

const TABS: TabDef[] = [
  {
    key: 'map',
    label: '패권지도',
    href: (id) => `/${id}`,
    match: (p, id) => p === `/${id}`,
    Icon: Map,
  },
  {
    key: 'flow',
    label: '자금흐름',
    href: (id) => `/${id}/money-flow`,
    match: (p, id) => p === `/${id}/money-flow` || p.startsWith(`/${id}/money-flow/`),
    Icon: Wallet,
  },
  {
    key: 'price',
    label: '등락율',
    href: (id) => `/${id}/price-changes`,
    match: (p, id) => p === `/${id}/price-changes` || p.startsWith(`/${id}/price-changes/`),
    Icon: BarChart3,
  },
  {
    key: 'stats',
    label: '기업·섹터 트렌드',
    href: (id) => `/${id}/statistics`,
    match: (p, id) => p === `/${id}/statistics` || p.startsWith(`/${id}/statistics/`),
    Icon: LineChart,
  },
]

/**
 * 산업 페이지 전용 컨텍스트 바
 *
 * - 좌: 브레드크럼 `홈 > [산업]` + 4탭 (패권지도/자금흐름/등락율/기업·섹터 트렌드)
 * - 우: rightActions (RegionToggle, period 등 페이지가 주입)
 * - 반응형 표준 패턴
 */
export function IndustryContextBar({ industryId, rightActions }: IndustryContextBarProps) {
  const pathname = usePathname() || ''
  const { data } = useIndustries({ region: 'all' })
  const industry = data?.industries.find((i) => i.id === industryId)
  const industryName = industry?.name ?? industryId
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (!activeRef.current) return
    // 모바일 가로 스크롤에서 활성 탭이 화면 밖이면 자동으로 보이도록 한다.
    activeRef.current.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'instant' as ScrollBehavior,
    })
  }, [pathname])

  return (
    <div className="border-b border-border-subtle bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-2">
            {/* 브레드크럼 */}
            <nav aria-label="브레드크럼" className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                홈
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
              <span className="text-foreground font-medium line-clamp-1" aria-current="page">
                {industryName}
              </span>
            </nav>

            {/* 4탭 — 모바일 가로 스크롤 */}
            <nav
              aria-label="산업 탭"
              className="-mx-4 px-4 overflow-x-auto scrollbar-thin sm:mx-0 sm:px-0 sm:overflow-visible"
            >
              <div className="inline-flex items-center gap-1 whitespace-nowrap">
                {TABS.map((tab) => {
                  const active = tab.match(pathname, industryId)
                  const Icon = tab.Icon
                  return (
                    <Link
                      key={tab.key}
                      ref={active ? activeRef : undefined}
                      href={tab.href(industryId)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                        active
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{tab.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>

          {rightActions && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">{rightActions}</div>
          )}
        </div>
      </div>
    </div>
  )
}
