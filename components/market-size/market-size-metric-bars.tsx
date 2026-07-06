'use client'

import { useMemo } from 'react'
import { CHART_POSITIVE, CHART_NEGATIVE } from '@/lib/chart-colors'
import { cn } from '@/lib/utils'

/** 막대 차트가 필요로 하는 최소 노드 형태 (MarketSizeCategory·MarketSizeNode 모두 충족). */
export interface MetricNode {
  id: string
  name: string
  marketCap: number
  revenueGrowth: number | null
  targetUpside: number | null
}

interface Props {
  nodes: MetricNode[]
  metricKey: 'revenueGrowth' | 'targetUpside'
  onSelect?: (id: string) => void
  isLoading?: boolean
  limit?: number
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`
}

/**
 * 단일 지표(매출 성장률 또는 상승여력) 수평 랭킹 막대.
 * - 지표 desc 정렬, 상위 limit개, null 제외.
 * - 소프트 캡(상위 85%×1.2, 최소 40%)으로 극단값이 다른 막대를 눌러버리지 않게. 라벨은 실제값.
 * - 양수 emerald / 음수 rose.
 */
export function MarketSizeMetricBars({
  nodes,
  metricKey,
  onSelect,
  isLoading,
  limit = 12,
}: Props) {
  const { rows, cap } = useMemo(() => {
    const arr = nodes
      .map((n) => ({ id: n.id, name: n.name, value: n[metricKey] }))
      .filter((r): r is { id: string; name: string; value: number } => r.value != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
    const sorted = arr.map((r) => Math.abs(r.value)).sort((a, b) => a - b)
    const p85 = sorted[Math.floor(sorted.length * 0.85)] ?? 0.4
    const cap = Math.max(p85 * 1.2, 0.4)
    return { rows: arr, cap }
  }, [nodes, metricKey, limit])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="h-40 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">데이터가 없습니다</span>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const positive = r.value >= 0
        const width = Math.max(3, (Math.min(Math.abs(r.value), cap) / cap) * 100)
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect?.(r.id)}
              className={cn(
                'w-full flex items-center gap-2 sm:gap-3 text-left rounded-md px-1 py-1 transition-colors',
                onSelect ? 'hover:bg-surface-2 cursor-pointer' : 'cursor-default'
              )}
            >
              <span className="w-16 sm:w-24 shrink-0 truncate text-xs sm:text-sm text-foreground">
                {r.name}
              </span>
              <div className="flex-1 h-5 sm:h-6 rounded bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${width}%`,
                    background: positive ? CHART_POSITIVE : CHART_NEGATIVE,
                  }}
                />
              </div>
              <span
                className={cn(
                  'w-12 sm:w-14 shrink-0 text-right text-xs sm:text-sm tabular-nums font-medium',
                  positive ? 'text-success' : 'text-destructive'
                )}
              >
                {fmtPct(r.value)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
