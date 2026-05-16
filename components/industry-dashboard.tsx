'use client'

import Link from 'next/link'
import {
  Stethoscope,
  Zap,
  ShoppingCart,
  Landmark,
  Flame,
  TrendingUp,
  ArrowDown,
  Mail,
} from 'lucide-react'
import { useIndustries } from '@/hooks/use-industries'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { RegionToggle } from './region-toggle'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { MiniSparkline } from '@/components/ui/mini-sparkline'
import { OnboardingHintStrip } from '@/components/onboarding/onboarding-hint-strip'
import { formatMarketCap, formatKrw, formatFlowAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CompanyStatsCard } from '@/components/dashboard/company-stats-card'
import { PriceChangesCard } from '@/components/dashboard/price-changes-card'
import { IndustryMoneyFlowCard } from '@/components/dashboard/industry-money-flow-card'
import { MarketPulseStrip } from '@/components/dashboard/market-pulse-strip'
import { TickerTape } from '@/components/dashboard/ticker-tape'
import { NewsHomeCardSlot } from '@/components/news/news-home-card-slot'
import { KoreanPicksCard } from '@/components/dashboard/korean-picks-card'
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
      <GlobalTopBar
        pageId="dashboard"
        lastUpdated={lastUpdated}
        shareTitle="Sector King - 투자 패권 지도"
        shareDescription="산업별 섹터 시장 지배력 순위 시각화"
        extraActions={<RegionToggle value={region} onChange={setRegion} />}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-10">
        {/* Page masthead — 한국어 메인 + 영문 보조 2단 헤로 */}
        <section className="border-b border-foreground/80 pb-6 sm:pb-8 mb-8 sm:mb-10">
          {/* eyebrow row: amber accent · 마지막 업데이트 KST */}
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
              The Map of Capital · 자금 흐름 지도
            </p>
            {lastUpdated ? (
              <p className="eyebrow num-mono">{lastUpdated} · KST</p>
            ) : null}
          </div>

          {/* h1 한국어 메인 헤드라인 */}
          <h1 className="display text-3xl sm:text-5xl lg:text-6xl tracking-tight text-foreground">
            시장의 돈이 어디로 흐르는가.
            <br className="hidden sm:block" />
            <span className="display-italic text-foreground/70">산업·섹터·종목 단위로.</span>
          </h1>

          {/* 영문 보조 카피 */}
          <p className="mt-3 text-xs uppercase tracking-wider font-medium text-amber-700/85 dark:text-amber-400/70">
            Where capital sits today, where it moves next.
          </p>

          {/* 가치 제안 */}
          <p className="mt-4 max-w-2xl text-sm text-foreground/75">
            매일 아침, 산업별 자금 흐름과 핵심 마켓 뉴스를 한 통의 메일로 정리해 드립니다.
          </p>

          {/* CTA row */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#industries"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 border-amber-600 bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
              산업 지도 보기
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 border-amber-700/70 text-amber-800 hover:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
            >
              <Mail className="h-4 w-4" aria-hidden />
              메일로 받기
            </Link>
          </div>
        </section>

        {/* Onboarding hint strip (자동 투어 폐기 후 신규 진입 안내) */}
        <section className="mb-6">
          <OnboardingHintStrip />
        </section>

        {/* Market Pulse Strip — 최상단 KPI 헤로 */}
        <section>
          <p className="eyebrow eyebrow-accent mb-3">Market Pulse</p>
          <MarketPulseStrip region={region} />
        </section>

        {/* 핫 종목 TickerTape */}
        <section className="mt-8">
          <p className="eyebrow mb-2">Hot Tickers · Today</p>
          <TickerTape region={region} limit={20} />
        </section>

        {/* 오늘의 마켓 리포트 */}
        <section className="mt-8">
          <NewsHomeCardSlot />
        </section>

        {/* 오늘의 한국 추천 종목 — 메일과 동일 콘텐츠 노출 + 이유 보러가기 CTA */}
        <KoreanPicksCard />

        {/* Industry Money Flow */}
        <section className="mt-12">
          <SectionHeader
            eyebrow="14-Day Flow"
            title="산업별 자금 흐름"
            description="시가총액 변화로 본 산업 단위 유입·유출"
          />
          <IndustryMoneyFlowCard region={region} />
        </section>

        {/* Industry Cards Grid */}
        <section id="industries" className="mt-12 scroll-mt-24">
          <SectionHeader
            eyebrow="Hegemony Map"
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
        <section className="mt-12">
          <SectionHeader
            eyebrow="Market Brief"
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
      className="group block sk-card sk-card-hover"
      {...(isFirst ? { 'data-tour': 'industry-card' } : {})}
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-border-subtle bg-background">
            <IndustryIcon
              iconKey={industry.id}
              className="h-5 w-5 text-foreground"
            />
          </span>
          <div className="min-w-0">
            {industry.nameEn ? (
              <p className="eyebrow truncate">{industry.nameEn}</p>
            ) : null}
            <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight truncate">
              {industry.name}
            </h2>
          </div>
        </div>

        {/* Market Cap + Sparkline */}
        <div className="border-t border-border-subtle pt-3 mb-3">
          <p className="eyebrow mb-1">Market Cap</p>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="num-mono text-xl sm:text-2xl text-foreground">
                  {formatMarketCap(industry.totalMarketCap)}
                </span>
                <span className={cn('num-mono text-xs', changeColor)}>
                  {industry.marketCapChange > 0 ? '+' : ''}
                  {industry.marketCapChange.toFixed(2)}%
                </span>
              </div>
              <p className="num-mono text-[10px] text-muted-foreground mt-0.5">
                {formatKrw(industry.totalMarketCap)}
              </p>
            </div>
            {industry.marketCapHistory && industry.marketCapHistory.length >= 2 && (
              <MiniSparkline
                data={industry.marketCapHistory}
                trend={trend}
                width={72}
                height={26}
                fill
                className="shrink-0"
                ariaLabel={`${industry.name} 14일 시총 추세`}
              />
            )}
          </div>
        </div>

        {/* Insight one-liner */}
        {insight && (
          <p className="text-xs text-foreground/70 line-clamp-1 mb-3 flex items-center gap-1.5">
            {insight.icon}
            <span>{insight.text}</span>
          </p>
        )}

        {/* Stats */}
        <dl className="grid grid-cols-3 pt-3 border-t border-border-subtle">
          {[
            { label: 'Categories', value: industry.categoryCount },
            { label: 'Sectors', value: industry.sectorCount },
            { label: 'Companies', value: industry.companyCount },
          ].map((s, i) => (
            <div
              key={s.label}
              className={cn(
                'px-2',
                i > 0 && 'border-l border-border-subtle'
              )}
            >
              <dt className="eyebrow text-[9px]">{s.label}</dt>
              <dd className="num-mono text-base text-foreground mt-0.5">{s.value}</dd>
            </div>
          ))}
        </dl>
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
    <div className="rounded-md border border-dashed border-border bg-surface-1/40 p-5 opacity-70">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-dashed border-border bg-background">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Coming Soon</p>
          <h2 className="font-display text-lg font-semibold text-muted-foreground leading-tight truncate">
            {name}
          </h2>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">곧 추가될 예정입니다</p>
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
            <div key={i} className="sk-card">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sk-card">
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
