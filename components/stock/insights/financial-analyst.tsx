'use client'

import { Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  formatPercent,
  formatPrice,
  formatRecommendation,
  formatMarketCap,
} from '@/lib/format'
import type { CompanyDetailResponse } from '@/types'

interface FinancialAnalystProps {
  data: CompanyDetailResponse
}

interface MetricRow {
  label: string
  value: string
  show: boolean
}

/**
 * S7 재무·애널리스트 — ROE/영업이익률/부채비율/베타 + 목표주가/추천/애널수.
 * KR 결측 필드(FCF·D&E)는 행 자체를 숨김(폴백). 가격성 값은 API toUsd.
 */
export function FinancialAnalyst({ data }: FinancialAnalystProps) {
  const { score, analystUpside } = data

  if (!score) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <Header />
        <p className="rounded-md border border-dashed border-border-subtle p-3 text-sm text-muted-foreground">
          재무 지표를 산출 중입니다.
        </p>
      </section>
    )
  }

  const financialRows: MetricRow[] = [
    {
      label: 'ROE',
      value: formatPercent(score.returnOnEquity),
      show: score.returnOnEquity != null,
    },
    {
      label: '영업이익률',
      value: formatPercent(score.operatingMargin),
      show: score.operatingMargin != null,
    },
    {
      label: '부채비율(D/E)',
      value: score.debtToEquity != null ? score.debtToEquity.toFixed(2) : 'N/A',
      show: score.debtToEquity != null,
    },
    {
      label: '베타',
      value: score.beta != null ? score.beta.toFixed(2) : 'N/A',
      show: score.beta != null,
    },
    {
      label: '잉여현금흐름',
      value: formatMarketCap(score.freeCashflow ?? null),
      show: score.freeCashflow != null,
    },
  ].filter((r) => r.show)

  const hasCoverage =
    score.recommendationKey != null && score.recommendationKey !== 'none'

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <Header />

      <div className="space-y-4">
        {/* 재무 지표 그리드 */}
        <div>
          <p className="eyebrow mb-2">재무</p>
          {financialRows.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {financialRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="num-mono text-sm font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">재무 지표 데이터 없음</p>
          )}
        </div>

        {/* 애널리스트 */}
        <div className="border-t border-border pt-3">
          <p className="eyebrow mb-2">애널리스트</p>
          {hasCoverage ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">투자의견</span>
                <span className="flex items-center gap-1.5">
                  <Badge className="border font-medium">
                    {formatRecommendation(score.recommendationKey)}
                  </Badge>
                  {score.analystCount != null && score.analystCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({score.analystCount}명)
                    </span>
                  )}
                </span>
              </div>
              {analystUpside?.targetMeanPriceUsd != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">목표주가</span>
                  <span className="num-mono text-sm font-medium text-foreground">
                    {formatPrice(analystUpside.targetMeanPriceUsd)}
                    {analystUpside.upsidePct != null && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({formatPercent(analystUpside.upsidePct)})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              애널리스트 커버리지 없음
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Header() {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <Landmark className="h-4 w-4" aria-hidden />
      재무·애널리스트
    </h2>
  )
}
