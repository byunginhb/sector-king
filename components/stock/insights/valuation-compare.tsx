'use client'

import { Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyInsightsResponse, ValuationMetric } from '@/types'

interface ValuationCompareProps {
  insights: CompanyInsightsResponse
}

interface MetricSpec {
  key: 'peRatio' | 'pegRatio' | 'returnOnEquity' | 'priceToBook' | 'evToEbitda'
  label: string
  /** 표시 포맷 (ROE 는 %, 배수 지표는 x배). */
  format: (v: number) => string
  /** true면 높을수록 우위(ROE), false면 낮을수록 우위(PER/PEG/PBR/EV·EBITDA)로 톤 결정. */
  higherIsBetter: boolean
}

const METRICS: MetricSpec[] = [
  { key: 'peRatio', label: 'PER', format: (v) => v.toFixed(1), higherIsBetter: false },
  { key: 'priceToBook', label: 'PBR', format: (v) => v.toFixed(2), higherIsBetter: false },
  { key: 'evToEbitda', label: 'EV/EBITDA', format: (v) => v.toFixed(1), higherIsBetter: false },
  { key: 'pegRatio', label: 'PEG', format: (v) => v.toFixed(2), higherIsBetter: false },
  {
    key: 'returnOnEquity',
    label: 'ROE',
    format: (v) => `${(v * 100).toFixed(1)}%`,
    higherIsBetter: true,
  },
]

/**
 * S5 밸류에이션 상대비교 (P1) — PER/PEG/ROE vs 섹터 중앙값 + percentile.
 * percentile/median 은 min-peer(N≥4) 표본에서만 산출(API). 표본 부족 시 안내.
 */
export function ValuationCompare({ insights }: ValuationCompareProps) {
  const { valuation, insufficientPeerSample, sectorContext } = insights

  if (!valuation || !sectorContext) return null

  if (insufficientPeerSample) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <Header />
        <p className="rounded-md border border-dashed border-border-subtle p-3 text-sm text-muted-foreground">
          비교 데이터 부족 (동종 종목 {sectorContext.peerCount}개). 섹터 표본이 4개 이상일 때
          중앙값 비교를 표시합니다.
        </p>
      </section>
    )
  }

  const keyMetric = insights.keyValuationMetric

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <Header />
      <div className="space-y-4">
        {METRICS.map((spec) => (
          <MetricRow
            key={spec.key}
            spec={spec}
            metric={valuation[spec.key]}
            isKey={spec.key === keyMetric?.key}
          />
        ))}
      </div>
      {keyMetric && (
        <p className="mt-3 rounded-md border border-dashed border-border-subtle p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          이 기업 유형의 핵심 지표는{' '}
          <span className="font-medium text-foreground">{keyMetric.label}</span> — {keyMetric.reason}
          <br />
          함께 볼 지표: {keyMetric.companion}
        </p>
      )}
      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
        {sectorContext.sectorName} 섹터 {sectorContext.peerCount}개 종목 분포 기준.
      </p>
    </section>
  )
}

function MetricRow({
  spec,
  metric,
  isKey,
}: {
  spec: MetricSpec
  metric: ValuationMetric
  isKey: boolean
}) {
  if (metric.value == null || metric.median == null) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            {spec.label}
            {isKey && (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                핵심
              </span>
            )}
          </span>
          <span className="text-muted-foreground">비교 데이터 부족</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted opacity-50" aria-hidden />
      </div>
    )
  }

  const { value, median, percentile } = metric
  // 본값이 중앙값보다 우위인지 (방향 고려)
  const better = spec.higherIsBetter ? value > median : value < median
  const tone = better ? 'text-success' : 'text-warning'
  const barTone = better ? 'bg-success' : 'bg-warning'

  // diverging bar: 중앙(50%)이 median. percentile 위치로 마커 배치(0~100 → 0~100% width).
  const markerPct = percentile != null ? Math.min(100, Math.max(0, percentile)) : 50

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{spec.label}</span>
        <span className="num-mono text-muted-foreground">
          <span className={cn('font-medium', tone)}>{spec.format(value)}</span>
          <span className="mx-1">·</span>
          중앙값 {spec.format(median)}
        </span>
      </div>
      <div
        className="relative h-2 w-full rounded-full bg-muted"
        role="progressbar"
        aria-label={`${spec.label} 섹터 내 백분위`}
        aria-valuenow={Math.round(markerPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* 중앙값(50%) 기준선 */}
        <span
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-border"
          style={{ left: '50%' }}
          aria-hidden
        />
        {/* 본값 percentile 마커 */}
        <span
          className={cn('absolute top-1/2 h-3 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full', barTone)}
          style={{ left: `${markerPct}%` }}
          aria-hidden
        />
      </div>
      {percentile != null && (
        <p className="mt-1 text-[11px] text-muted-foreground">섹터 백분위 {Math.round(percentile)}%</p>
      )}
    </div>
  )
}

function Header() {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <Scale className="h-4 w-4" aria-hidden />
      밸류에이션 상대비교
    </h2>
  )
}
