'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCompany } from '@/hooks/use-company'
import { useCompanyInsights } from '@/hooks/use-company-insights'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { ShareButton } from '@/components/share-button'
import { WatchStarToggle } from '@/components/me/watch-star-toggle'
import {
  StockDetailSkeleton,
  StockDetailError,
} from '@/components/stock/stock-detail-sections'
import { RegionBadge } from '@/components/stock/stock-price-banner'
import { StockHegemonyBadges } from '@/components/stock/stock-hegemony-badges'
import { InsightHero } from '@/components/stock/insights/insight-hero'
import { ShortLongScores } from '@/components/stock/insights/short-long-scores'
import { SignalSummary } from '@/components/stock/insights/signal-summary'
import { ScoreTrendChart } from '@/components/stock/insights/score-trend-chart'
import { SectorPosition } from '@/components/stock/insights/sector-position'
import { FinancialAnalyst } from '@/components/stock/insights/financial-analyst'
import { PriceChartSection } from '@/components/stock/insights/price-chart-section'
import { ValuationCompare } from '@/components/stock/insights/valuation-compare'
import type { CompanyDetailResponse } from '@/types'

interface StockDetailPageProps {
  ticker: string
  /** SSR/메타데이터에서 미리 알고 있는 표시명 (헤더·워치 토글 초기 표기용) */
  initialName?: string | null
  initialNameKo?: string | null
}

/**
 * `/stock/[ticker]` 라우트용 클라이언트 본문.
 * 모달(`StockDetailSections`)과 분리된 인사이트 섹션을 직접 조립한다.
 * - 좌(메인): S1 히어로 · S2 시그널 · S3 점수추이 · S4 섹터포지션 · S8 가격차트
 * - 우(사이드): S6 패권 · S7 재무·애널리스트 · S5 밸류에이션
 */
export function StockDetailPage({ ticker, initialName, initialNameKo }: StockDetailPageProps) {
  const { data, isLoading, error } = useCompany(ticker)

  const company = data?.company
  const displayName = company?.nameKo || company?.name || initialNameKo || initialName || ticker
  const subName = company?.name ?? initialName ?? ''

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        shareTitle={`${displayName} (${ticker}) | Sector King`}
        shareDescription={`${displayName}의 시가총액·섹터 지배력·패권 점수 분석`}
      />

      <main className="container mx-auto px-4 py-6">
        {/* 반응형 표준 헤더 */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <Link
              href="/"
              aria-label="홈으로 돌아가기"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              홈
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground truncate">
                {displayName}
              </h1>
              <span className="text-muted-foreground text-lg font-normal">({ticker})</span>
              <RegionBadge ticker={ticker} />
            </div>
            {subName && subName !== displayName && (
              <p className="text-sm text-muted-foreground mt-1">{subName}</p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <ShareButton
              title={`${displayName} (${ticker}) | Sector King`}
              description={`${displayName}의 시가총액·섹터 지배력·패권 점수 분석`}
            />
            <WatchStarToggle
              itemType="ticker"
              itemKey={ticker}
              displayName={displayName}
              size="md"
            />
          </div>
        </header>

        {isLoading && <StockDetailSkeleton showChart />}
        {!isLoading && (error || !data) && (
          <StockDetailError message="종목 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />
        )}
        {!isLoading && data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <StockInsights ticker={ticker} data={data} />
          </motion.div>
        )}
      </main>
    </div>
  )
}

/** 인사이트 섹션 조립 — base 응답(즉시) + insights(지연/병렬) 조합. */
function StockInsights({
  ticker,
  data,
}: {
  ticker: string
  data: CompanyDetailResponse
}) {
  const { data: insights } = useCompanyInsights(ticker)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* 메인 컬럼 */}
      <div className="space-y-6">
        <InsightHero ticker={ticker} data={data} />
        <ShortLongScores data={data} scoreHistory={insights?.scoreHistory} />
        <SignalSummary data={data} insights={insights} />
        {insights && (
          <ScoreTrendChart
            history={insights.scoreHistory}
            appliedRange={insights.appliedRange}
          />
        )}
        {insights && <SectorPosition insights={insights} />}
        <PriceChartSection ticker={ticker} initialHistory={data.history} />
      </div>

      {/* 사이드 컬럼 */}
      <div className="space-y-6">
        <DominanceCard data={data} />
        <FinancialAnalyst data={data} />
        {insights && <ValuationCompare insights={insights} />}
      </div>
    </div>
  )
}

/** S6 패권 포지션 — StockHegemonyBadges 재사용 + 멀티섹터 요약 한 줄. */
function DominanceCard({ data }: { data: CompanyDetailResponse }) {
  const { sectors, dominance } = data
  if (!sectors || sectors.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      {dominance && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-foreground">
          {dominance.topRankCount > 0 && (
            <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
          )}
          <span className="font-medium">{dominance.sectorCount}개 섹터</span>
          <span className="text-muted-foreground">중</span>
          <span className="font-medium">{dominance.topRankCount}개 1위</span>
          {dominance.bestRank != null && (
            <span className="text-xs text-muted-foreground">
              (최고 {dominance.bestRank}위)
            </span>
          )}
        </p>
      )}
      {!dominance && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          패권 포지션
        </h2>
      )}
      <StockHegemonyBadges sectors={sectors} />
    </section>
  )
}
