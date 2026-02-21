'use client'

import { useCompany } from '@/hooks/use-company'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMarketCap, formatPrice, formatPriceChange, formatPercent, formatScore, formatRecommendation } from '@/lib/format'
import { SCORING } from '@/lib/scoring-methodology'
import { getPriceChangeStyle, getRankStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

function getStockUrl(ticker: string): { url: string; label: string } {
  // Korean stocks (KRX): 005930.KS → Naver Finance
  if (ticker.endsWith('.KS')) {
    const code = ticker.replace('.KS', '')
    return {
      url: `https://finance.naver.com/item/main.naver?code=${code}`,
      label: '네이버 증권에서 상세 차트 보기',
    }
  }
  // Other stocks → Yahoo Finance
  return {
    url: `https://finance.yahoo.com/quote/${ticker}`,
    label: 'Yahoo Finance에서 상세 차트 보기',
  }
}

interface CompanyDetailProps {
  ticker: string
}

export function CompanyDetail({ ticker }: CompanyDetailProps) {
  const { data, isLoading, error } = useCompany(ticker)

  if (isLoading) {
    return <CompanyDetailSkeleton />
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <p className="text-muted-foreground">Failed to load company data</p>
      </div>
    )
  }

  const { company, snapshot, score, sectors, history } = data

  // Calculate cumulative change from first recorded date
  const cumulativeChange = (() => {
    if (!history || history.length < 2 || !snapshot?.price) return null
    const firstPrice = history[0].price
    if (!firstPrice) return null
    const change = ((snapshot.price - firstPrice) / firstPrice) * 100
    return {
      change,
      startDate: history[0].date,
    }
  })()

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {company.nameKo || company.name}
          <span className="text-muted-foreground text-base font-normal ml-2">({company.ticker})</span>
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">{company.name}</DialogDescription>
      </DialogHeader>

      {/* Current Price Banner */}
      {snapshot && (
        <div className="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(snapshot.price ?? null)}
            </span>
            {cumulativeChange && (
              <div className="flex items-baseline gap-1">
                <span className={cn('text-lg font-semibold', getPriceChangeStyle(cumulativeChange.change))}>
                  {formatPriceChange(cumulativeChange.change)}
                </span>
                <span className="text-xs text-muted-foreground">
                  (섹터킹 추적 시작일 대비)
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            시가총액: {formatMarketCap(snapshot.marketCap ?? null)}
          </p>
          {/* Stock Link */}
          {(() => {
            const stockLink = getStockUrl(company.ticker)
            return (
              <a
                href={stockLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {stockLink.label}
              </a>
            )
          })()}
        </div>
      )}

      {/* Hegemony Areas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          패권 영역
        </h3>
        <div className="flex flex-wrap gap-2">
          {sectors.map(({ sector, rank }) => {
            const style = getRankStyle(rank)
            return (
              <Badge
                key={sector.id}
                className={cn('border font-medium', style.badge)}
              >
                {rank === 1 && <span className="text-amber-500 mr-1">★</span>}
                {sector.name}: {style.label}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Score Analysis */}
      {score && <ScoreAnalysis score={score} snapshot={snapshot} />}
    </div>
  )
}

interface ScoreDimension {
  label: string
  value: number
  max: number
  color: string
  description: string
  metrics?: { label: string; value: string }[]
}

function ScoreAnalysis({
  score,
  snapshot,
}: {
  score: NonNullable<import('@/types').CompanyDetailResponse['score']>
  snapshot: import('@/types').CompanyDetailResponse['snapshot']
}) {
  const totalPercent = Math.min((score.total / SCORING.totalMaxScore) * 100, 100)

  const dimensions: ScoreDimension[] = [
    {
      label: '규모',
      value: score.scale,
      max: SCORING.scale.maxScore,
      color: 'bg-blue-500',
      description: '섹터 내 시가총액 비중과 거래 활성도',
    },
    {
      label: '성장성',
      value: score.growth,
      max: SCORING.growth.maxScore,
      color: 'bg-emerald-500',
      description: '분기별 매출/수익 성장률',
      metrics: [
        ...(score.revenueGrowth !== null
          ? [{ label: '매출 성장률', value: formatPercent(score.revenueGrowth) }]
          : []),
        ...(score.earningsGrowth !== null
          ? [{ label: '수익 성장률', value: formatPercent(score.earningsGrowth) }]
          : []),
      ],
    },
    {
      label: '수익성',
      value: score.profitability,
      max: SCORING.profitability.maxScore,
      color: 'bg-amber-500',
      description: '영업이익률과 자기자본이익률',
      metrics: [
        ...(score.operatingMargin !== null
          ? [{ label: '영업이익률', value: formatPercent(score.operatingMargin) }]
          : []),
        ...(score.returnOnEquity !== null
          ? [{ label: 'ROE', value: formatPercent(score.returnOnEquity) }]
          : []),
      ],
    },
    {
      label: '시장 평가',
      value: score.sentiment,
      max: SCORING.sentiment.maxScore,
      color: 'bg-purple-500',
      description: '애널리스트 투자의견과 목표주가 괴리율',
      metrics: [
        ...(score.recommendationKey
          ? [{
              label: '애널리스트 의견',
              value: `${formatRecommendation(score.recommendationKey)}${score.analystCount ? ` (${score.analystCount}명)` : ''}`,
            }]
          : []),
        ...(score.targetMeanPrice !== null && snapshot?.price
          ? [{
              label: '목표주가 대비',
              value: formatPercent((score.targetMeanPrice - snapshot.price) / snapshot.price),
            }]
          : []),
      ],
    },
  ]

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        패권 점수 분석
      </h3>

      <div className="rounded-xl border border-border p-4 space-y-4">
        {/* Total Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{score.total.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ {SCORING.totalMaxScore}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            데이터 커버리지 {Math.round(score.dataQuality * 100)}%
          </span>
        </div>
        <div className="bg-muted rounded-full h-2.5">
          <div
            className="bg-linear-to-r from-indigo-500 to-purple-500 rounded-full h-2.5 transition-all"
            style={{ width: `${totalPercent}%` }}
          />
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3 pt-1">
          {dimensions.map((dim) => {
            const percent = Math.min((dim.value / dim.max) * 100, 100)
            return (
              <div key={dim.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{dim.label}</span>
                  <span className="text-muted-foreground">{formatScore(dim.value, dim.max)}</span>
                </div>
                <div className="bg-muted rounded-full h-1.5">
                  <div
                    className={cn('rounded-full h-1.5 transition-all', dim.color)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{dim.description}</p>
                {dim.metrics && dim.metrics.length > 0 && (
                  <div className="pl-2 space-y-0.5">
                    {dim.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-medium text-foreground">{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Methodology Note */}
        <details className="pt-2 border-t border-border">
          <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            점수 산정 방식 알아보기
          </summary>
          <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
            <p>4개 차원(규모·성장성·수익성·시장 평가)의 합산으로 100점 만점 기준 산출됩니다.</p>
            <p>점수는 급격한 변동을 완화하기 위해 지수이동평균(EMA)으로 스무딩 처리됩니다.</p>
            <p>순위는 스무딩된 점수 순서대로 결정됩니다. 동점일 경우 시가총액이 큰 종목이 우선합니다.</p>
            <p>시총·거래량은 매일, 재무·애널리스트 지표는 주간 업데이트됩니다.</p>
          </div>
        </details>
      </div>
    </div>
  )
}

function CompanyDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  )
}
