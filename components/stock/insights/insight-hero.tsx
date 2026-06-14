'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { StockPriceBanner } from '@/components/stock/stock-price-banner'
import { SCORING } from '@/lib/scoring-methodology'
import { formatPercent } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse } from '@/types'

interface InsightHeroProps {
  ticker: string
  data: CompanyDetailResponse
}

/**
 * S1 요약 히어로 — 현재가·시총 배너 + 52주 위치 게이지 + 패권 점수 + 상승여력.
 * 가격성 값은 API 에서 toUsd 된 값을 받는다.
 */
export function InsightHero({ ticker, data }: InsightHeroProps) {
  const { snapshot, score, history, analystUpside } = data
  const fmt = useCurrencyFormat()

  const week52Position = snapshot?.week52Position ?? null
  const positionPct = week52Position != null ? Math.round(week52Position * 100) : null

  const upsidePct = analystUpside?.upsidePct ?? null
  const UpsideIcon = upsidePct == null ? Minus : upsidePct >= 0 ? TrendingUp : TrendingDown
  const upsideTone =
    upsidePct == null
      ? 'text-muted-foreground'
      : upsidePct >= 0
        ? 'text-success'
        : 'text-danger'

  const totalPercent =
    score != null ? Math.min((score.total / SCORING.totalMaxScore) * 100, 100) : null

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <StockPriceBanner ticker={ticker} snapshot={snapshot} history={history} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 52주 위치 게이지 */}
        <div className="space-y-2">
          <p className="eyebrow">52주 위치</p>
          {positionPct != null && snapshot ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="num-mono text-2xl text-foreground">{positionPct}%</span>
                <span className="text-xs text-muted-foreground">밴드 내</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="52주 가격 밴드 내 현재가 위치"
                aria-valuenow={positionPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${positionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{fmt.price(snapshot.week52Low ?? null)}</span>
                <span>{fmt.price(snapshot.week52High ?? null)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">데이터 없음</p>
          )}
        </div>

        {/* 패권 점수 */}
        <div className="space-y-2">
          <p className="eyebrow">패권 점수</p>
          {score != null ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="num-mono text-2xl text-foreground">
                  {score.total.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ {SCORING.totalMaxScore}</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="패권 점수 총점"
                aria-valuenow={Math.round(score.total * 10) / 10}
                aria-valuemin={0}
                aria-valuemax={SCORING.totalMaxScore}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${totalPercent ?? 0}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                데이터 커버리지 {Math.round(score.dataQuality * 100)}%
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">산출 중</p>
          )}
        </div>

        {/* 상승여력 */}
        <div className="space-y-2">
          <p className="eyebrow">목표주가 상승여력</p>
          {upsidePct != null ? (
            <>
              <div className={cn('flex items-baseline gap-1.5', upsideTone)}>
                <UpsideIcon className="h-5 w-5 self-center" aria-hidden />
                <span className="num-mono text-2xl">{formatPercent(upsidePct)}</span>
              </div>
              {analystUpside?.targetMeanPriceUsd != null && (
                <p className="text-[11px] text-muted-foreground">
                  컨센서스 목표가 {fmt.price(analystUpside.targetMeanPriceUsd)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              애널리스트 커버리지 없음
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
