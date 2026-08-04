'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { useSectorTrend } from '@/hooks/use-sector-trend'
import { useRegion } from '@/hooks/use-region'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import type { SectorTrendData } from '@/types'
import { CHART_AXIS, CHART_AXIS_LINE, CHART_SERIES } from '@/lib/chart-colors'

const PERIODS = [1, 3, 7, 14, 30] as const
const PERIOD_LABELS: Record<number, string> = {
  1: '1일',
  3: '3일',
  7: '7일',
  14: '14일',
  30: '30일',
}

const CHART_COLORS = [
  CHART_SERIES[0], CHART_SERIES[1], CHART_SERIES[2], CHART_SERIES[3], CHART_SERIES[4],
  CHART_SERIES[5], CHART_SERIES[6], CHART_SERIES[7], CHART_SERIES[0], CHART_SERIES[1],
]

const DEFAULT_VISIBLE_COUNT = 10
const MAX_INTENSITY_PERCENT = 20

function getFlowPercent(sector: SectorTrendData, period: number): number {
  return sector.periods.find((p) => p.period === period)?.flowPercent ?? 0
}

function getFlowAmount(sector: SectorTrendData, period: number): number {
  return sector.periods.find((p) => p.period === period)?.flowAmount ?? 0
}

function getCellBg(value: number): string {
  if (value === 0) return ''
  const abs = Math.min(Math.abs(value), MAX_INTENSITY_PERCENT)
  const intensity = Math.round((abs / MAX_INTENSITY_PERCENT) * 100)

  if (value > 0) {
    if (intensity > 60) return 'bg-success/30'
    if (intensity > 30) return 'bg-success/20'
    return 'bg-success/10'
  }
  if (intensity > 60) return 'bg-danger/30'
  if (intensity > 30) return 'bg-danger/20'
  return 'bg-danger/10'
}

function getCellText(value: number): string {
  if (value === 0) return 'text-muted-foreground'
  return value > 0 ? 'text-success' : 'text-danger'
}

interface SectorTrendSectionProps {
  industryId?: string
}

export function SectorTrendSection({ industryId }: SectorTrendSectionProps = {}) {
  const { region } = useRegion()
  const { data, isLoading, error } = useSectorTrend({ industryId, region })
  const fmt = useCurrencyFormat()
  const [sortPeriod, setSortPeriod] = useState(30)
  const [sortAsc, setSortAsc] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const sortedSectors = useMemo(() => {
    if (!data?.sectors) return []
    return [...data.sectors].sort((a, b) => {
      const aVal = getFlowPercent(a, sortPeriod)
      const bVal = getFlowPercent(b, sortPeriod)
      return sortAsc ? aVal - bVal : bVal - aVal
    })
  }, [data?.sectors, sortPeriod, sortAsc])

  const chartSectors = useMemo(() => {
    if (!data?.sectors) return []
    const sorted = [...data.sectors].sort(
      (a, b) => Math.abs(getFlowPercent(b, 30)) - Math.abs(getFlowPercent(a, 30))
    )
    return showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE_COUNT)
  }, [data?.sectors, showAll])

  const chartData = useMemo(() => {
    return PERIODS.map((period) => {
      const point: Record<string, string | number> = {
        period: PERIOD_LABELS[period],
      }
      for (const sector of chartSectors) {
        point[sector.id] = getFlowPercent(sector, period)
      }
      return point
    })
  }, [chartSectors])

  function handleHeaderClick(period: number) {
    if (sortPeriod === period) {
      setSortAsc((prev) => !prev)
    } else {
      setSortPeriod(period)
      setSortAsc(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-muted rounded-md animate-pulse" />
        <div className="h-80 bg-muted rounded-md animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">{error.message}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div data-tour="sector-trend" className="space-y-8">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          섹터 추이 종합
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {data.dateRange
            ? `${data.dateRange.start} ~ ${data.dateRange.end}`
            : '전 섹터 기간별 변화율 비교'}
        </p>
      </div>

      {/* Table Section */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          섹터별 변화율 (%)
        </h3>
        <div className="overflow-x-auto rounded-md border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2">
                <th className="sticky left-0 bg-surface-2 px-4 py-3 text-left font-semibold text-foreground min-w-[160px]">
                  섹터
                </th>
                {PERIODS.map((p) => (
                  <th
                    key={p}
                    role="columnheader"
                    aria-sort={sortPeriod === p ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleHeaderClick(p)}
                    className={cn(
                      'px-4 py-3 text-right font-semibold cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-surface-3 min-w-[80px]',
                      sortPeriod === p
                        ? 'text-info'
                        : 'text-foreground'
                    )}
                  >
                    {PERIOD_LABELS[p]}
                    {sortPeriod === p && (
                      <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSectors.map((sector) => (
                <tr
                  key={sector.id}
                  className="border-t border-border-subtle hover:bg-surface-2"
                >
                  <td className="sticky left-0 bg-surface-1 px-4 py-2.5 font-medium text-foreground">
                    {sector.name}
                  </td>
                  {PERIODS.map((p) => {
                    const percent = getFlowPercent(sector, p)
                    const amount = getFlowAmount(sector, p)
                    return (
                      <td
                        key={p}
                        title={`시총 변화: ${fmt.marketCap(amount)}`}
                        className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-medium',
                          getCellBg(percent),
                          getCellText(percent)
                        )}
                      >
                        {percent > 0 ? '+' : ''}{percent.toFixed(2)}%
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedSectors.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            데이터가 없습니다
          </p>
        )}
      </section>

      {/* Chart Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">
            기간별 변화율 차트
          </h3>
          {data.sectors.length > DEFAULT_VISIBLE_COUNT && (
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="text-sm text-info hover:underline"
            >
              {showAll
                ? `상위 ${DEFAULT_VISIBLE_COUNT}개만 보기`
                : `전체 ${data.sectors.length}개 보기`}
            </button>
          )}
        </div>
        <div className="bg-surface-1 rounded-md border border-border-subtle p-4">
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* key: 표시 섹터 집합(전체/상위10) 변경 시 stale 활성 인덱스로 십자선이 어긋나는 것 방지. */}
              <LineChart
                key={chartSectors.map((s) => s.id).join(',')}
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_AXIS_LINE }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: CHART_AXIS }}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  itemSorter={(item) => -(item.value as number)}
                  formatter={(value, name) => {
                    const sector = chartSectors.find((s) => s.id === name)
                    const numValue = value as number
                    return [
                      `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`,
                      sector?.name || (name as string),
                    ]
                  }}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: 'white',
                    border: `1px solid ${CHART_AXIS_LINE}`,
                    borderRadius: 8,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    maxHeight: 300,
                    overflowY: 'auto',
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const sector = chartSectors.find((s) => s.id === value)
                    return sector?.name || value
                  }}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke={CHART_AXIS} strokeDasharray="3 3" />
                {chartSectors.map((sector, index) => (
                  <Line
                    key={sector.id}
                    type="monotone"
                    dataKey={sector.id}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  )
}
