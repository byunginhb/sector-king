'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Stethoscope, Zap, ShoppingCart, Landmark, Flame, TrendingUp } from 'lucide-react'
import { useIndustries } from '@/hooks/use-industries'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { ThemeToggle } from './theme-toggle'
import { SearchTrigger } from './search-trigger'
import { HelpButton } from './onboarding/help-button'
import { ShareButton } from './share-button'
import { SectorKingLogo } from './logo'
import { RegionToggle } from './region-toggle'
import { AuthButtonClient } from './auth/auth-button-client'
import { SectionHeader } from '@/components/ui/section-header'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { MiniSparkline } from '@/components/ui/mini-sparkline'
import { formatMarketCap, formatRelativeTime, formatKrw, formatFlowAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CompanyStatsCard } from '@/components/dashboard/company-stats-card'
import { PriceChangesCard } from '@/components/dashboard/price-changes-card'
import { IndustryMoneyFlowCard } from '@/components/dashboard/industry-money-flow-card'
import { MarketPulseStrip } from '@/components/dashboard/market-pulse-strip'
import { NewsHomeCardSlot } from '@/components/news/news-home-card-slot'
import type { IndustryOverview } from '@/types'

export function IndustryDashboard() {
  const { region, setRegion } = useRegion()
  const { data, isLoading, error } = useIndustries({ region })
  usePageTour('dashboard')

  if (isLoading) return <DashboardSkeleton />
  if (error) return <DashboardError error={error} />
  if (!data) return null

  const { industries, lastUpdated } = data

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectorKingLogo size={40} className="shrink-0" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  Sector King
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  산업별 투자 패권 지도
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {lastUpdated && (
                <UpdateTimestamp dateStr={lastUpdated} />
              )}
              <RegionToggle value={region} onChange={setRegion} />
              <ShareButton
                title="Sector King - 투자 패권 지도"
                description="산업별 섹터 시장 지배력 순위 시각화"
              />
              <SearchTrigger />
              <HelpButton pageId="dashboard" />
              <ThemeToggle />
              <AuthButtonClient />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Market Pulse Strip — 최상단 KPI 헤로 */}
        <section>
          <MarketPulseStrip region={region} />
        </section>

        {/* 오늘의 마켓 리포트 — MarketPulseStrip 바로 아래, 발행본 있으면 노출 */}
        <section className="mt-6">
          <NewsHomeCardSlot />
        </section>

        {/* Industry Money Flow */}
        <section className="mt-10">
          <SectionHeader
            title="산업별 자금 흐름"
            description="시가총액 변화로 본 산업 단위 유입·유출"
          />
          <IndustryMoneyFlowCard region={region} />
        </section>

        {/* Industry Cards Grid */}
        <section className="mt-10">
          <SectionHeader
            title="산업 패권 지도"
            description="산업을 선택해 카테고리·섹터·기업 단위로 드릴다운"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {industries.map((industry, index) => (
              <IndustryCard key={industry.id} industry={industry} isFirst={index === 0} />
            ))}
            {industries.length < 5 && (
              <>
                <ComingSoonCard name="헬스케어" iconKey="healthcare" />
                <ComingSoonCard name="에너지/자원" iconKey="energy" />
                <ComingSoonCard name="소비재" iconKey="consumer" />
                <ComingSoonCard name="금융" iconKey="finance" />
              </>
            )}
          </div>
        </section>

        {/* Summary Stats Cards */}
        <section className="mt-10">
          <SectionHeader
            title="시장 동향 요약"
            description="회사 통계와 가격 변화를 한눈에"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompanyStatsCard region={region} />
            <PriceChangesCard region={region} />
          </div>
        </section>
      </main>
    </div>
  )
}

function IndustryCard({
  industry,
  isFirst = false,
}: {
  isFirst?: boolean
  industry: IndustryOverview
}) {
  const changeColor =
    industry.marketCapChange > 0
      ? 'text-success'
      : industry.marketCapChange < 0
        ? 'text-danger'
        : 'text-muted-foreground'

  // 미니 인사이트 한 줄 — topCompany / topSector 우선
  const insight = buildInsight(industry)

  const trend: 'up' | 'down' | 'flat' =
    industry.marketCapChange > 0 ? 'up' : industry.marketCapChange < 0 ? 'down' : 'flat'

  return (
    <Link
      href={`/${industry.id}`}
      className="group block rounded-2xl border border-border-subtle bg-surface-1 transition-[border-color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-primary/30 hover:bg-surface-2"
      {...(isFirst ? { 'data-tour': 'industry-card' } : {})}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <IndustryIcon
            iconKey={industry.id}
            className="h-6 w-6 text-muted-foreground"
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-card-foreground group-hover:text-primary transition-colors leading-tight">
              {industry.name}
            </h2>
            {industry.nameEn && (
              <p className="text-xs text-muted-foreground leading-tight">{industry.nameEn}</p>
            )}
          </div>
        </div>

        {/* Market Cap + Sparkline */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-0.5">총 시가총액</p>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-bold tabular-nums text-card-foreground tracking-tight">
                  {formatMarketCap(industry.totalMarketCap)}
                </span>
                <span className={cn('text-xs font-medium tabular-nums', changeColor)}>
                  {industry.marketCapChange > 0 ? '+' : ''}
                  {industry.marketCapChange.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                ({formatKrw(industry.totalMarketCap)})
              </p>
            </div>
            {industry.marketCapHistory && industry.marketCapHistory.length >= 2 && (
              <MiniSparkline
                data={industry.marketCapHistory}
                trend={trend}
                width={72}
                height={28}
                fill
                className="shrink-0"
                ariaLabel={`${industry.name} 14일 시총 추세`}
              />
            )}
          </div>
        </div>

        {/* Insight one-liner */}
        {insight && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3 flex items-center gap-1.5">
            {insight.icon}
            <span>{insight.text}</span>
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-subtle">
          <div className="text-center">
            <p className="text-sm font-semibold text-card-foreground leading-tight tabular-nums">
              {industry.categoryCount}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">카테고리</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-card-foreground leading-tight tabular-nums">
              {industry.sectorCount}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">섹터</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-card-foreground leading-tight tabular-nums">
              {industry.companyCount}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">기업</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function buildInsight(
  industry: IndustryOverview
): { icon: React.ReactNode; text: string } | null {
  const top = industry.topCompanyByChange
  const sec = industry.topSectorByFlow

  if (top && top.changePercent > 0) {
    const name = top.nameKo || top.name
    return {
      icon: <TrendingUp className="h-3 w-3 text-success shrink-0" aria-hidden />,
      text: `등락 1위 ${name} +${top.changePercent.toFixed(1)}%`,
    }
  }
  if (sec && sec.flowAmount > 0) {
    return {
      icon: <Flame className="h-3 w-3 text-primary shrink-0" aria-hidden />,
      text: `자금 1위 ${sec.name} +${formatFlowAmount(sec.flowAmount)}`,
    }
  }
  if (top) {
    const name = top.nameKo || top.name
    return {
      icon: <TrendingUp className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />,
      text: `등락 1위 ${name} ${top.changePercent.toFixed(1)}%`,
    }
  }
  return null
}

function ComingSoonCard({
  name,
  iconKey,
}: {
  name: string
  iconKey: 'healthcare' | 'energy' | 'consumer' | 'finance'
}) {
  const Icon =
    iconKey === 'healthcare'
      ? Stethoscope
      : iconKey === 'energy'
        ? Zap
        : iconKey === 'consumer'
          ? ShoppingCart
          : Landmark
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-1/50 opacity-60">
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-muted-foreground leading-tight">{name}</h2>
            <p className="text-xs text-muted-foreground leading-tight">Coming Soon</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">곧 추가될 예정입니다</p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border-subtle bg-background">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-7 w-40 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function UpdateTimestamp({ dateStr }: { dateStr: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className="text-xs text-muted-foreground">{dateStr} 기준</span>
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

function DashboardError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center py-12 px-6 max-w-md">
        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}
