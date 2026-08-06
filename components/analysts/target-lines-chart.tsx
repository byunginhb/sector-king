'use client'

import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { PALETTE, PRICE_COLOR } from './ui'
import type { AnalystPricePoint } from '@/types'

// 테마 대응: recharts inline SVG 는 CSS 변수를 상속받는다(프로젝트 표준: indices-comparison-chart).
const AXIS_COLOR = 'hsl(var(--muted-foreground))'
const AXIS_LINE = 'hsl(var(--border))'
const TOOLTIP_STYLE = {
  fontSize: 12,
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  color: 'hsl(var(--popover-foreground))',
  borderRadius: 8,
} as const
const PRICE_KEY = '__price'
// 애널리스트 예측선은 전부 동일 점선 — 색상으로만 구분(사용자 요청).
const DASH = '5 3'
/**
 * 선 굵기 위계 — 색만으로는 겹칠 때 구분이 안 돼서 두께도 함께 나눈다.
 * 실제 주가(기준·점 없음) > 컨센서스/주인공(emphasis·점 있음) > 개별 예측(점선).
 */
const PRICE_WIDTH = 3
const EMPHASIS_WIDTH = 1.9
const SERIES_WIDTH = 1.4

export interface TargetSeries {
  key: string
  label: string
  points: { date: string; target: number }[]
  emphasis?: boolean
  color?: string
}

interface Props {
  prices: AnalystPricePoint[]
  series: TargetSeries[]
  targetShape?: 'linear' | 'stepAfter'
  height?: number
  showLegend?: boolean
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function TargetLinesChart({
  prices,
  series,
  targetShape = 'linear',
  height = 300,
  showLegend = true,
}: Props) {
  const fmt = useCurrencyFormat()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const chartData = useMemo(() => {
    const dates = new Set<string>()
    prices.forEach((p) => dates.add(p.date))
    series.forEach((s) => s.points.forEach((p) => dates.add(p.date)))
    const priceMap = new Map(prices.map((p) => [p.date, p.price]))
    const seriesMaps = series.map((s) => ({ key: s.key, map: new Map(s.points.map((p) => [p.date, p.target])) }))
    return [...dates]
      .sort()
      .map((date) => {
        const row: Record<string, number | string | null> = { date, [PRICE_KEY]: priceMap.get(date) ?? null }
        for (const s of seriesMaps) row[s.key] = s.map.get(date) ?? null
        return row
      })
  }, [prices, series])

  const colorOf = (i: number) => PALETTE[i % PALETTE.length]

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: AXIS_COLOR }}
            interval="preserveStartEnd"
            minTickGap={40}
            tickLine={false}
            axisLine={{ stroke: AXIS_LINE }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: AXIS_COLOR }}
            tickFormatter={(v) => fmt.priceCompact(v as number)}
            tickLine={false}
            axisLine={false}
            width={58}
          />
          <Tooltip
            labelFormatter={(l) => fmtDate(l as string)}
            formatter={(value, name) => [fmt.price(value as number), name as string]}
            labelStyle={{ color: AXIS_COLOR, fontWeight: 500 }}
            contentStyle={TOOLTIP_STYLE}
          />
          {showLegend && (
            <Legend
              onClick={(e) => toggle(String((e as { dataKey?: string }).dataKey ?? ''))}
              wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
            />
          )}
          <Line
            type="monotone"
            dataKey={PRICE_KEY}
            name="실제 주가"
            stroke={PRICE_COLOR}
            strokeWidth={PRICE_WIDTH}
            dot={false}
            connectNulls
            hide={hidden.has(PRICE_KEY)}
            isAnimationActive={false}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type={targetShape}
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? colorOf(i)}
              strokeWidth={s.emphasis ? EMPHASIS_WIDTH : SERIES_WIDTH}
              strokeDasharray={s.emphasis ? undefined : DASH}
              dot={{ r: s.emphasis ? 3 : 2 }}
              connectNulls
              hide={hidden.has(s.key)}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
