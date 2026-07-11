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

// 기본 선택(전부 그리면 복잡해 한국 투자자 기준 대표 2개만 켜둔다).
const DEFAULT_SELECTED = ['^GSPC', '^KS11']

/** 나라별 고정 색(선택 여부와 무관하게 같은 색 유지). */
const colorFor = (i: number) => `hsl(var(--chart-${(i % 12) + 1}))`

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
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED))
  const { data, isLoading, isError } = useIndicesHistory(range)

  const series = useMemo(() => data?.series ?? [], [data])

  const toggle = (symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  // 선택 여부와 무관하게 나라→색 인덱스를 고정한다.
  const colorIndex = useMemo(() => {
    const m: Record<string, number> = {}
    series.forEach((s, i) => (m[s.symbol] = i))
    return m
  }, [series])

  const nameBySymbol = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of series) m[s.symbol] = `${s.country} ${s.name}`
    return m
  }, [series])

  // 각 지수를 기간 시작점 대비 % 변화로 정규화(선택된 것만 계산).
  const chartData = useMemo(() => {
    const active = series.filter((s) => selected.has(s.symbol))
    if (active.length === 0) return []
    const dateSet = new Set<string>()
    const firstClose: Record<string, number> = {}
    const closeByDate: Record<string, Map<string, number>> = {}
    for (const s of active) {
      if (s.points.length > 0) firstClose[s.symbol] = s.points[0].close
      closeByDate[s.symbol] = new Map(s.points.map((p) => [p.date, p.close]))
      for (const p of s.points) dateSet.add(p.date)
    }
    const dates = [...dateSet].sort()
    return dates.map((date) => {
      const row: Record<string, string | number | null> = { date }
      for (const s of active) {
        const c = closeByDate[s.symbol].get(date)
        const f = firstClose[s.symbol]
        row[s.symbol] = c != null && f ? ((c - f) / f) * 100 : null
      }
      return row
    })
  }, [series, selected])

  const activeSeries = series.filter((s) => selected.has(s.symbol))

  const formatTick = (value: string) => {
    if (range === '5y' || range === '1y') return value.slice(2, 7).replace('-', '.')
    return value.slice(5).replace('-', '/')
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">국가별 지수 비교</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            보고 싶은 나라를 눌러 켜고 끄세요. 기간 시작점을 0%로 맞춰 비교합니다.
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

      {/* 나라 선택 칩 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {series.map((s) => {
          const active = selected.has(s.symbol)
          const color = colorFor(colorIndex[s.symbol] ?? 0)
          return (
            <button
              key={s.symbol}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(s.symbol)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-transparent bg-surface-2 text-foreground'
                  : 'border-border-subtle text-muted-foreground hover:text-foreground'
              )}
              style={active ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: active ? color : 'hsl(var(--muted-foreground) / 0.4)' }}
                aria-hidden
              />
              {s.country} {s.name}
            </button>
          )
        })}
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-1 p-3 sm:p-4">
        {isError ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            그래프를 불러오지 못했어요
          </div>
        ) : isLoading && series.length === 0 ? (
          <Skeleton className="h-80 w-full" />
        ) : activeSeries.length === 0 ? (
          <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            위에서 보고 싶은 나라를 한 곳 이상 선택하세요.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* key: 기간/선택 변경 시 stale 활성 인덱스로 십자선이 어긋나는 것 방지(remount). */}
              <LineChart
                key={`${range}:${activeSeries.map((s) => s.symbol).join(',')}`}
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
                    return [
                      `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`,
                      nameBySymbol[name as string] ?? name,
                    ]
                  }}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <Legend
                  formatter={(value) => nameBySymbol[value as string] ?? value}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                {series.map((s) =>
                  selected.has(s.symbol) ? (
                    <Line
                      key={s.symbol}
                      type="monotone"
                      dataKey={s.symbol}
                      stroke={colorFor(colorIndex[s.symbol] ?? 0)}
                      strokeWidth={1.75}
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
