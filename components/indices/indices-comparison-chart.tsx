'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types'
import type {
  IndicesHistoryResponse,
  IndexRange,
} from '@/app/api/indices/history/route'

const RANGE_OPTIONS: { value: IndexRange; label: string }[] = [
  { value: '1w', label: '1주' },
  { value: '1m', label: '1개월' },
  { value: '1y', label: '1년' },
  { value: '5y', label: '5년' },
]

function useIndicesHistory(range: IndexRange) {
  return useQuery<IndicesHistoryResponse>({
    queryKey: ['indices-history', range],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const res = await fetch(`/api/indices/history?range=${range}`)
      if (!res.ok) throw new Error('Failed to fetch index history')
      const json: ApiResponse<IndicesHistoryResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}

export function IndicesComparisonChart() {
  const [range, setRange] = useState<IndexRange>('1y')
  const { data, isLoading, isError } = useIndicesHistory(range)

  const series = useMemo(() => data?.series ?? [], [data])

  // 각 지수를 기간 시작점 대비 % 변화로 정규화해 한 차트에서 비교 가능하게 만든다.
  const chartData = useMemo(() => {
    if (series.length === 0) return []
    const dateSet = new Set<string>()
    const firstClose: Record<string, number> = {}
    const closeByDate: Record<string, Map<string, number>> = {}
    for (const s of series) {
      if (s.points.length > 0) firstClose[s.symbol] = s.points[0].close
      closeByDate[s.symbol] = new Map(s.points.map((p) => [p.date, p.close]))
      for (const p of s.points) dateSet.add(p.date)
    }
    const dates = [...dateSet].sort()
    return dates.map((date) => {
      const row: Record<string, string | number | null> = { date }
      for (const s of series) {
        const c = closeByDate[s.symbol].get(date)
        const f = firstClose[s.symbol]
        row[s.symbol] = c != null && f ? ((c - f) / f) * 100 : null
      }
      return row
    })
  }, [series])

  const nameBySymbol = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of series) m[s.symbol] = `${s.country} ${s.name}`
    return m
  }, [series])

  const formatTick = (value: string) => {
    // 'YYYY-MM-DD' → 범위에 따라 간결히
    if (range === '5y' || range === '1y') return value.slice(2, 7).replace('-', '.') // YY.MM
    return value.slice(5).replace('-', '/') // MM/DD
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">국가별 지수 비교</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            기간 시작점을 0%로 맞춰, 어느 나라 시장이 더 오르내렸는지 한눈에 비교해요.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="기간 선택"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5"
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={range === opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5',
                range === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-1 p-3 sm:p-4">
        {isError ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            그래프를 불러오지 못했어요
          </div>
        ) : isLoading && chartData.length === 0 ? (
          <Skeleton className="h-80 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            표시할 데이터가 없습니다
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* key: 기간 변경 시 stale 활성 인덱스로 십자선이 어긋나는 것 방지(remount). */}
              <LineChart
                key={range}
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTick}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${(v as number).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  itemSorter={(item) => -(item.value as number)}
                  formatter={(value, name) => {
                    const v = value as number
                    return [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, nameBySymbol[name as string] ?? name]
                  }}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    maxHeight: 280,
                    overflowY: 'auto',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Legend
                  formatter={(value) => nameBySymbol[value as string] ?? value}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                {series.map((s, i) => (
                  <Line
                    key={s.symbol}
                    type="monotone"
                    dataKey={s.symbol}
                    stroke={`hsl(var(--chart-${(i % 8) + 1}))`}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
