'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { LineChart as LineChartIcon } from 'lucide-react'
import {
  CHART_PRIMARY,
  CHART_SERIES,
  CHART_AXIS,
  CHART_AXIS_LINE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import type { ScoreHistoryPoint } from '@/types'

interface ScoreTrendChartProps {
  history: ScoreHistoryPoint[]
  appliedRange: number
}

const COMPONENT_SERIES = [
  { key: 'scale', label: '규모', color: CHART_SERIES[0] },
  { key: 'growth', label: '성장성', color: CHART_SERIES[1] },
  { key: 'profitability', label: '수익성', color: CHART_SERIES[2] },
  { key: 'sentiment', label: '시장평가', color: CHART_SERIES[3] },
] as const

type ComponentKey = (typeof COMPONENT_SERIES)[number]['key']

/** 5일 미만은 차트를 그리지 않고 호출부가 숨김 처리(여기서는 안내 렌더). */
const MIN_CHART_POINTS = 5

/**
 * S3 점수 추이 — smoothed_score 메인 Area + 4구성요소 Line 토글.
 * company-trend-chart 멀티시리즈 패턴 차용. 차트 색은 chart-colors SoT.
 */
export function ScoreTrendChart({ history, appliedRange }: ScoreTrendChartProps) {
  const [active, setActive] = useState<Set<ComponentKey>>(new Set())

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        dateLabel: new Date(h.date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [history]
  )

  if (history.length < MIN_CHART_POINTS) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LineChartIcon className="h-4 w-4" aria-hidden />
          패권 점수 추이
        </h2>
        <p className="rounded-md border border-dashed border-border-subtle p-4 text-sm text-muted-foreground">
          추이 데이터 축적 중 ({history.length}/74일). 데이터가 더 모이면 표시됩니다.
        </p>
      </section>
    )
  }

  const toggle = (key: ComponentKey) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const first = history[0].total
  const last = history[history.length - 1].total
  const delta = last - first
  const altText = `최근 ${appliedRange}일 패권 점수 추이: ${first.toFixed(1)}점에서 ${last.toFixed(1)}점으로 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}점 변화.`

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LineChartIcon className="h-4 w-4" aria-hidden />
          패권 점수 추이
          <span className="text-xs font-normal text-muted-foreground">최근 {appliedRange}일</span>
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="점수 구성요소 토글">
          {COMPONENT_SERIES.map((s) => {
            const isOn = active.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={isOn}
                className={cn(
                  'rounded-full border px-2 py-1 text-xs transition-colors sm:px-3 sm:py-1.5',
                  isOn
                    ? 'border-transparent text-white'
                    : 'border-border-subtle text-muted-foreground hover:text-foreground'
                )}
                style={isOn ? { backgroundColor: s.color } : undefined}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <figure className="m-0">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreTotalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: CHART_AXIS }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: CHART_AXIS }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                formatter={(value, name) => [`${(value as number).toFixed(1)}점`, name as string]}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="total"
                name="종합(smoothed)"
                stroke={CHART_PRIMARY}
                strokeWidth={2}
                fill="url(#scoreTotalGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'white' }}
              />
              {COMPONENT_SERIES.filter((s) => active.has(s.key)).map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{altText}</figcaption>
      </figure>
    </section>
  )
}
