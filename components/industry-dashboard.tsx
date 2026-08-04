'use client'

import Link from 'next/link'
import { Flame, TrendingUp } from 'lucide-react'
import { useIndustries } from '@/hooks/use-industries'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { RegionToggle } from './region-toggle'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { IndustryCapChart } from '@/components/dashboard/industry-cap-chart'
import { OnboardingHintStrip } from '@/components/onboarding/onboarding-hint-strip'
import { useCurrencyFormat, type CurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { CompanyStatsCard } from '@/components/dashboard/company-stats-card'
import { PriceChangesCard } from '@/components/dashboard/price-changes-card'
import { IndustryMoneyFlowCard } from '@/components/dashboard/industry-money-flow-card'
import { MarketPulseStrip } from '@/components/dashboard/market-pulse-strip'
import { TickerTape } from '@/components/dashboard/ticker-tape'
import { NewsHomeCardSlot } from '@/components/news/news-home-card-slot'
import { EconomicCalendarSection } from '@/components/dashboard/economic-calendar-section'
import { KoreanPicksCard } from '@/components/dashboard/korean-picks-card'
import { SectorKingPickCard } from '@/components/dashboard/sector-king-pick-card'
import { AnalystScorecardCard } from '@/components/dashboard/analyst-scorecard-card'
import { QuickNavCards } from '@/components/dashboard/quick-nav-cards'
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

      {/*
        레이아웃 위계 — 4단. 1면(LEAD) → 오늘(TODAY) → 지도(MAP) → 자료(BRIEF).
        단 사이는 sk-rule 한 줄 + 큰 여백(mt-16/24), 단 안쪽은 작은 여백(mt-6/8)
        으로 벌린다. 전 구획이 같은 mt-12 로 쌓이면 위계 없는 카드 적층으로 읽힌다.
      */}
      <main className="container mx-auto px-4 py-8 sm:py-10">
        {/* ───────── LEAD — 제호 + 오늘의 시세 띠 + 자금 흐름 단독 ───────── */}
        <section className="border-b border-foreground/80 pb-6 sm:pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="display text-3xl sm:text-5xl lg:text-6xl leading-[1.02] text-foreground">
              시장의 돈이 어디로 흐르는가.
            </h1>
            <Link
              href="/news"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
            >
              무료 뉴스 이메일 받기
            </Link>
          </div>
        </section>

        {/* 시세 띠 — 제호 바로 아래 붙여 신문 1면 리듬. 자체 라벨 불필요. */}
        <div className="mt-4">
          <TickerTape region={region} limit={20} />
        </div>

        <div className="mt-4">
          <OnboardingHintStrip />
        </div>

        {/* 리드 기사 — 이 서비스가 답하는 질문 그 자체라 단독으로 크게 둔다 */}
        <section id="money-flow" className="mt-10 scroll-mt-24">
          <IndustryMoneyFlowCard region={region} />
        </section>

        <div className="mt-8 md:hidden">
          <QuickNavCards />
        </div>

        <hr className="sk-rule mt-16 sm:mt-24" />

        {/* ───────── TODAY — 오늘 읽을 것 / 오늘 살 것 ─────────
            섹션 제목을 두지 않는다. 아래 두 카드가 각자 자기 이름("오늘의 마켓
            리포트" / "섹터킹 픽 TOP 5")을 이미 달고 있어서, 바깥에 "오늘의 시장"을
            또 두면 같은 위계의 제목이 150px 안에 두 개 겹쳐 서로 경쟁한다.
            단 경계는 위의 sk-rule + 큰 여백이 이미 만든다.
            (아래 MAP·BRIEF 는 자식들이 자기 이름이 없어서 섹션 제목이 필요하다.) */}
        <section className="mt-8" aria-label="오늘의 시장">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <NewsHomeCardSlot />
            <SectorKingPickCard region={region} />
          </div>
          <div className="mt-6">
            <KoreanPicksCard />
          </div>
        </section>

        <hr className="sk-rule mt-16 sm:mt-24" />

        {/* ───────── MAP — 산업 인덱스 ───────── */}
        <section id="industries" className="mt-8 scroll-mt-24">
          <SectionHeader eyebrow="Hegemony Map" title="산업 패권 지도" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry, index) => (
              <IndustryCard key={industry.id} industry={industry} isFirst={index === 0} />
            ))}
          </div>
        </section>

        <hr className="sk-rule mt-16 sm:mt-24" />

        {/* ───────── BRIEF — 참고 자료. 리드보다 의도적으로 조용하게 ───────── */}
        <section className="mt-8">
          <SectionHeader eyebrow="Market Brief" title="시장 동향 요약" />
          <MarketPulseStrip region={region} />
          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <CompanyStatsCard region={region} />
            <PriceChangesCard region={region} />
          </div>
          {/* 캘린더는 월 그리드(7열)라 반폭에서 날짜 칸이 눌리고, 성적표는 3행뿐이라
              나란히 두면 한쪽에 빈 공간이 크게 남는다. 각자 전폭으로 쌓는다. */}
          <div className="mt-6">
            <EconomicCalendarSection />
          </div>
          <div className="mt-6">
            <AnalystScorecardCard />
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
  const fmt = useCurrencyFormat()
  const changeColor =
    industry.marketCapChange > 0
      ? 'text-success'
      : industry.marketCapChange < 0
        ? 'text-danger'
        : 'text-muted-foreground'

  // 미니 인사이트 한 줄 — topCompany / topSector 우선
  const insight = buildInsight(industry, fmt)

  const trend: 'up' | 'down' | 'flat' =
    industry.marketCapChange > 0 ? 'up' : industry.marketCapChange < 0 ? 'down' : 'flat'

  return (
    <Link
      href={`/${industry.id}`}
      className="group block sk-card sk-card-hover p-5"
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

        {/* Market Cap — 추세 차트를 카드 메인 시각요소로 */}
        <div className="border-t border-border-subtle pt-3 mb-3">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="eyebrow">Market Cap</p>
            <span className={cn('num-mono text-xs', changeColor)}>
              {industry.marketCapChange > 0 ? '+' : ''}
              {industry.marketCapChange.toFixed(2)}%
            </span>
          </div>
          <div className="num-mono text-xl sm:text-2xl text-foreground">
            {fmt.marketCap(industry.totalMarketCap)}
          </div>
          {industry.marketCapHistory && industry.marketCapHistory.length >= 2 && (
            <div className="mt-2">
              <IndustryCapChart
                data={industry.marketCapHistory}
                trend={trend}
                format={(v) => fmt.marketCap(v)}
                ariaLabel={`${industry.name} 14일 시총 추세`}
              />
            </div>
          )}
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
  industry: IndustryOverview,
  fmt: CurrencyFormat
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
      text: `자금 1위 ${sec.name} +${fmt.flowAmount(sec.flowAmount)}`,
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
            <div key={i} className="sk-card p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sk-card p-5">
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
      <div className="max-w-md px-6 py-12 text-center">
        <p className="eyebrow mb-2">Error</p>
        <h2 className="font-display mb-2 text-xl font-semibold text-foreground">
          데이터를 불러오지 못했습니다
        </h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}
