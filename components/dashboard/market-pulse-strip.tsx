'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Flame, ArrowRightLeft, Layers, ChevronRight } from 'lucide-react'
import { MarketCapDetailModal } from './market-cap-detail-modal'
import { useIndustries } from '@/hooks/use-industries'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { useCountUp } from '@/hooks/use-count-up'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { MiniSparkline } from '@/components/ui/mini-sparkline'
import type { RegionFilter } from '@/types'

interface MarketPulseStripProps {
  region?: RegionFilter
}

/**
 * 메인 헤로 KPI 띠 — 시장 거시 지표 4종.
 *
 * 1. 추적 종목 시총 (중복 제거 — 멀티산업 종목 1회만 합산)
 * 2. 전일 대비 % (추적 종목 시총 기준)
 * 3. 핫 섹터 (14일 자금 유입 1위)
 * 4. 가장 큰 자금 이동 (산업 단위 net flow 절댓값 1위)
 */
export function MarketPulseStrip({ region = 'all' }: MarketPulseStripProps) {
  const { data: indData, isLoading: indLoading } = useIndustries({ region })
  const { data: flowData, isLoading: flowLoading } = useIndustryMoneyFlow({
    period: 14,
    region,
  })
  const fmt = useCurrencyFormat()
  const [detailOpen, setDetailOpen] = useState(false)

  const aggregates = useMemo(() => {
    if (!indData) {
      return null
    }
    const industries = indData.industries
    // 추적 종목 전체(중복 제거) 집계. 산업 합산은 멀티산업 종목을 중복 계산하므로 이 값을 우선 사용.
    const market = indData.market

    // 1. 추적 종목 시총 (중복 제거). market 부재(구버전 캐시) 시 산업 합산으로 폴백.
    const totalMarketCap =
      market?.marketCapTotal ??
      industries.reduce((sum, i) => sum + (i.totalMarketCap ?? 0), 0)
    const tickerCount = market?.tickerCount ?? null

    // 2. 전일 대비 % — dedup 총합 기준. 부재 시 산업 시총 가중 평균으로 폴백.
    let dayChangePct: number
    if (market) {
      dayChangePct = market.marketCapChange
    } else {
      let weightedNumer = 0
      let weightedDenom = 0
      for (const i of industries) {
        // i.marketCapChange 는 (today - prev) / prev * 100
        // i.totalMarketCap 는 today 시총. prev = today / (1 + change/100)
        const change = i.marketCapChange ?? 0
        const today = i.totalMarketCap ?? 0
        const prev = change !== -100 ? today / (1 + change / 100) : 0
        if (prev > 0) {
          weightedNumer += change * prev
          weightedDenom += prev
        }
      }
      dayChangePct = weightedDenom > 0 ? weightedNumer / weightedDenom : 0
    }

    // 3. 핫 섹터 — 모든 산업의 topSectorByFlow 중 flow 1위
    let hotSector: { name: string; flow: number; industryName: string } | null = null
    for (const i of industries) {
      const s = i.topSectorByFlow
      if (s && (hotSector === null || s.flowAmount > hotSector.flow)) {
        hotSector = { name: s.name, flow: s.flowAmount, industryName: i.name }
      }
    }

    // 4. 가장 큰 자금 이동 — flowData.industries 의 |netFlow| 최대
    let biggestMove: {
      industryName: string
      netFlow: number
      direction: 'in' | 'out'
    } | null = null
    if (flowData?.industries?.length) {
      for (const i of flowData.industries) {
        const abs = Math.abs(i.netFlow)
        if (biggestMove === null || abs > Math.abs(biggestMove.netFlow)) {
          biggestMove = {
            industryName: i.industryName,
            netFlow: i.netFlow,
            direction: i.flowDirection,
          }
        }
      }
    }

    // 시총 추세용: dedup 시계열 우선. 부재 시 산업별 시계열 합산(중복 포함)으로 폴백.
    let totalHistory: number[]
    if (market?.marketCapHistory?.length) {
      totalHistory = market.marketCapHistory
    } else {
      const histLen = Math.max(0, ...industries.map((i) => i.marketCapHistory?.length ?? 0))
      totalHistory = []
      for (let idx = 0; idx < histLen; idx++) {
        let s = 0
        for (const ind of industries) {
          s += ind.marketCapHistory?.[idx] ?? 0
        }
        totalHistory.push(s)
      }
    }

    return {
      totalMarketCap,
      tickerCount,
      totalHistory,
      dayChangePct: Math.round(dayChangePct * 100) / 100,
      hotSector,
      biggestMove,
    }
  }, [indData, flowData])

  const isLoading = indLoading || flowLoading

  if (isLoading || !aggregates) {
    return <MarketPulseStripSkeleton />
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="추적 종목 시총"
        hint={
          aggregates.tickerCount
            ? `Sector King이 추적하는 미국·한국 주요 ${aggregates.tickerCount.toLocaleString()}개 종목의 합산 시가총액입니다. 전체 시장 시가총액이 아닙니다.`
            : '추적 중인 미국·한국 주요 종목의 합산 시가총액입니다. 전체 시장 시가총액이 아닙니다.'
        }
        icon={<Layers className="h-4 w-4 text-muted-foreground" />}
        onClick={() => setDetailOpen(true)}
        actionLabel="일자별 추이 보기"
      >
        <KpiValue
          value={
            <CountUpMcap value={aggregates.totalMarketCap} />
          }
          sub={
            <div className="space-y-1">
              <MiniSparkline
                data={aggregates.totalHistory}
                width={96}
                height={20}
                fill
                ariaLabel="14일 시총 추세"
              />
              <p className="text-[10px] leading-tight text-muted-foreground">
                {aggregates.tickerCount
                  ? `추적 ${aggregates.tickerCount.toLocaleString()}개 종목 합산`
                  : '추적 종목 합산'}
                <span className="text-muted-foreground/70"> · 전체 시장 아님</span>
              </p>
            </div>
          }
        />
      </KpiCard>

      <KpiCard
        label="전일 대비"
        icon={
          aggregates.dayChangePct >= 0 ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-danger" />
          )
        }
      >
        <KpiValue
          value={
            <span
              className={cn(
                'num-mono text-2xl sm:text-3xl tracking-tight',
                aggregates.dayChangePct >= 0 ? 'text-success' : 'text-danger'
              )}
            >
              <CountUpPercent value={aggregates.dayChangePct} />
            </span>
          }
          sub={
            <span className="text-xs text-muted-foreground">
              추적 종목 시총 기준
            </span>
          }
        />
      </KpiCard>

      <KpiCard
        label="핫 섹터"
        icon={<Flame className="h-4 w-4 text-primary" />}
      >
        {aggregates.hotSector ? (
          <KpiValue
            value={
              <span className="font-display text-xl sm:text-2xl font-semibold text-card-foreground truncate block tracking-tight">
                {aggregates.hotSector.name}
              </span>
            }
            sub={
              <span className="text-xs text-muted-foreground num-mono">
                {aggregates.hotSector.industryName} · 14d{' '}
                <span
                  className={cn(
                    'font-medium',
                    aggregates.hotSector.flow >= 0 ? 'text-success' : 'text-danger'
                  )}
                >
                  {aggregates.hotSector.flow >= 0 ? '+' : '-'}
                  {fmt.flowAmount(Math.abs(aggregates.hotSector.flow))}
                </span>
              </span>
            }
          />
        ) : (
          <EmptyValue />
        )}
      </KpiCard>

      <KpiCard
        label="가장 큰 자금 이동"
        hint="기간 시가총액 변화 기준 · 실제 순매수 자금이 아닙니다"
        icon={<ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
      >
        {aggregates.biggestMove ? (
          <KpiValue
            value={
              <span className="font-display text-xl sm:text-2xl font-semibold text-card-foreground truncate block tracking-tight">
                {aggregates.biggestMove.industryName}
              </span>
            }
            sub={
              <span
                className={cn(
                  'num-mono text-xs',
                  aggregates.biggestMove.direction === 'in' ? 'text-success' : 'text-danger'
                )}
              >
                {aggregates.biggestMove.direction === 'in' ? '↑ inflow ' : '↓ outflow '}
                {aggregates.biggestMove.netFlow >= 0 ? '+' : '-'}
                {fmt.flowAmount(Math.abs(aggregates.biggestMove.netFlow))}
              </span>
            }
          />
        ) : (
          <EmptyValue />
        )}
      </KpiCard>

      <MarketCapDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        region={region}
      />
    </div>
  )
}

/* ─── Sub-components ─── */

function KpiCard({
  label,
  icon,
  hint,
  children,
  onClick,
  actionLabel,
}: {
  label: string
  icon?: React.ReactNode
  hint?: string
  children: React.ReactNode
  /** 지정 시 카드 전체가 클릭 가능한 버튼이 되고 우상단에 chevron affordance 표시 */
  onClick?: () => void
  /** 클릭 시 동작 설명 (a11y). onClick 과 함께 사용 */
  actionLabel?: string
}) {
  const header = (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <p className="eyebrow" title={hint}>
        {label}
      </p>
      {onClick && (
        <ChevronRight
          className="ml-auto h-4 w-4 text-muted-foreground/60"
          aria-hidden
        />
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={actionLabel ?? label}
        className="sk-card sk-card-hover w-full text-left cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {header}
        {children}
      </button>
    )
  }

  return (
    <div className="sk-card sk-card-hover">
      {header}
      {children}
    </div>
  )
}

function KpiValue({
  value,
  sub,
}: {
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div>{value}</div>
      {sub && <div>{sub}</div>}
    </div>
  )
}

function EmptyValue() {
  return (
    <div className="space-y-1.5">
      <div className="text-xl font-bold text-muted-foreground/60">—</div>
      <div className="text-xs text-muted-foreground">데이터 부족</div>
    </div>
  )
}

function CountUpMcap({ value }: { value: number }) {
  const v = useCountUp(value, { duration: 700 })
  const fmt = useCurrencyFormat()
  return (
    <span className="num-mono text-2xl sm:text-3xl tracking-tight text-card-foreground">
      {fmt.marketCap(v)}
    </span>
  )
}

function CountUpPercent({ value }: { value: number }) {
  const v = useCountUp(value, { duration: 700 })
  const sign = v >= 0 ? '+' : ''
  return (
    <span>
      {sign}
      {v.toFixed(2)}%
    </span>
  )
}

/* ─── Skeleton ─── */

function MarketPulseStripSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sk-card">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
