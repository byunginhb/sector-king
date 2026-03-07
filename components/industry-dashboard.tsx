'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useIndustries } from '@/hooks/use-industries'
import { usePageTour } from '@/hooks/use-page-tour'
import { ThemeToggle } from './theme-toggle'
import { SearchTrigger } from './search-trigger'
import { HelpButton } from './onboarding/help-button'
import { ShareButton } from './share-button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMarketCap, formatRelativeTime, formatKrw } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CompanyStatsCard } from '@/components/dashboard/company-stats-card'
import { PriceChangesCard } from '@/components/dashboard/price-changes-card'
import { IndustryMoneyFlowCard } from '@/components/dashboard/industry-money-flow-card'

export function IndustryDashboard() {
  const { data, isLoading, error } = useIndustries()
  usePageTour('dashboard')

  if (isLoading) return <DashboardSkeleton />
  if (error) return <DashboardError error={error} />
  if (!data) return null

  const { industries, lastUpdated } = data

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                <span className="bg-linear-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  Sector King
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                산업별 투자 패권 지도
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {lastUpdated && (
                <UpdateTimestamp dateStr={lastUpdated} />
              )}
              <ShareButton
                title="Sector King - 투자 패권 지도"
                description="산업별 섹터 시장 지배력 순위 시각화"
              />
              <SearchTrigger />
              <HelpButton pageId="dashboard" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry, index) => (
            <IndustryCard key={industry.id} industry={industry} isFirst={index === 0} />
          ))}

          {/* Coming Soon Cards */}
          {industries.length < 5 && (
            <>
              <ComingSoonCard name="헬스케어" icon="💊" />
              <ComingSoonCard name="에너지/자원" icon="⚡" />
              <ComingSoonCard name="소비재" icon="🛒" />
              <ComingSoonCard name="금융" icon="🏦" />
            </>
          )}
        </div>

        {/* Industry Money Flow */}
        <div className="mt-8">
          <IndustryMoneyFlowCard />
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <CompanyStatsCard />
          <PriceChangesCard />
        </div>
      </main>
    </div>
  )
}

function IndustryCard({
  industry,
  isFirst = false,
}: {
  isFirst?: boolean
  industry: {
    id: string
    name: string
    nameEn: string | null
    icon: string | null
    categoryCount: number
    sectorCount: number
    companyCount: number
    totalMarketCap: number
    marketCapChange: number
  }
}) {
  const changeColor =
    industry.marketCapChange > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : industry.marketCapChange < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  return (
    <Link
      href={`/${industry.id}`}
      className="group block rounded-xl border border-border bg-card hover:bg-accent/50 transition-all hover:shadow-lg hover:border-primary/20"
      {...(isFirst ? { 'data-tour': 'industry-card' } : {})}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{industry.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
              {industry.name}
            </h2>
            {industry.nameEn && (
              <p className="text-sm text-muted-foreground">{industry.nameEn}</p>
            )}
          </div>
        </div>

        {/* Market Cap */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">총 시가총액</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-card-foreground">
              {formatMarketCap(industry.totalMarketCap)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({formatKrw(industry.totalMarketCap)})
            </span>
            <span className={cn('text-sm font-medium', changeColor)}>
              {industry.marketCapChange > 0 ? '+' : ''}
              {industry.marketCapChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-card-foreground">
              {industry.categoryCount}
            </p>
            <p className="text-xs text-muted-foreground">카테고리</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-card-foreground">
              {industry.sectorCount}
            </p>
            <p className="text-xs text-muted-foreground">섹터</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold text-card-foreground">
              {industry.companyCount}
            </p>
            <p className="text-xs text-muted-foreground">기업</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex items-center justify-end text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          패권 지도 보기
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

function ComingSoonCard({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 opacity-60">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl grayscale">{icon}</span>
          <div>
            <h2 className="text-xl font-bold text-muted-foreground">{name}</h2>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          곧 추가될 예정입니다
        </p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-10 w-40 mb-4" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
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
        'text-xs',
        isStale ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
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
