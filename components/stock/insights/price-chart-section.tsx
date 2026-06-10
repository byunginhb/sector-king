'use client'

import { useState } from 'react'
import { LineChart as LineChartIcon } from 'lucide-react'
import { PriceChart } from '@/components/price-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany } from '@/hooks/use-company'
import { cn } from '@/lib/utils'
import type { PriceHistory } from '@/types'

interface PriceChartSectionProps {
  ticker: string
  /** 초기 30일 history (이미 로드된 base 응답 재사용 — 즉시 표시). */
  initialHistory: PriceHistory[]
}

// value 는 base /api/company/[ticker] 의 HISTORY_RANGES(30/60/90/129) 와 반드시 일치해야 한다.
// 불일치 값은 resolveRange 가 기본값(30)으로 폴백시켜 토글이 무반응처럼 보인다.
const RANGE_OPTIONS = [
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
  { value: 129, label: '전체' },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]['value']

/**
 * S8 가격 차트 — 기간 토글(30/74/전체).
 * 30일은 base 응답을 재사용(추가 요청 없음). 그 외는 useCompany(range) 로 지연 로드.
 */
export function PriceChartSection({ ticker, initialHistory }: PriceChartSectionProps) {
  const [range, setRange] = useState<RangeValue>(30)

  // range=30 이면 초기 history 재사용(쿼리 비활성), 그 외만 추가 fetch
  const needsFetch = range !== 30
  const { data, isLoading } = useCompany(needsFetch ? ticker : '', { range })

  const history = needsFetch ? (data?.history ?? []) : initialHistory

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LineChartIcon className="h-4 w-4" aria-hidden />
          가격 추이
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="가격 차트 기간 선택">
          {RANGE_OPTIONS.map((opt) => {
            const isOn = range === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                aria-pressed={isOn}
                className={cn(
                  'rounded-full border px-2 py-1 text-xs transition-colors sm:px-3 sm:py-1.5',
                  isOn
                    ? 'border-transparent bg-primary text-white'
                    : 'border-border-subtle text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {needsFetch && isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : (
        <figure className="m-0">
          <PriceChart data={history} />
          <figcaption className="sr-only">
            최근 {history.length}일 가격 추이 차트.
          </figcaption>
        </figure>
      )}
    </section>
  )
}
