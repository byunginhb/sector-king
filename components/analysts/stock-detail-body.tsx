'use client'

import { useMemo, useState } from 'react'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { TargetLinesChart, type TargetSeries } from './target-lines-chart'
import { PALETTE, CONSENSUS_COLOR, pct, hitRateTone } from './ui'
import type { AnalystStockDetailResponse, StockAnalystSeries } from '@/types'
import { cn } from '@/lib/utils'

/** 각 애널의 held 목표가(해당일까지 최신)로 날짜별 중앙값 컨센서스선. */
function consensusMedian(analysts: StockAnalystSeries[]): { date: string; target: number }[] {
  const dates = [...new Set(analysts.flatMap((a) => a.points.map((p) => p.date)))].sort()
  const out: { date: string; target: number }[] = []
  for (const date of dates) {
    const held: number[] = []
    for (const a of analysts) {
      let v: number | null = null
      for (const p of a.points) {
        if (p.date <= date) v = p.target
        else break
      }
      if (v != null) held.push(v)
    }
    if (held.length === 0) continue
    held.sort((x, y) => x - y)
    const mid = Math.floor(held.length / 2)
    out.push({ date, target: held.length % 2 ? held[mid] : (held[mid - 1] + held[mid]) / 2 })
  }
  return out
}

/** 한 종목을 예측한 애널리스트들 비교(아코디언 본문). */
export function StockDetailBody({ data }: { data: AnalystStockDetailResponse }) {
  const fmt = useCurrencyFormat()
  // 기본: 모든 애널리스트 예측선 표시(칩으로 개별 끄고 켜기).
  const [selected, setSelected] = useState<Set<number>>(() => new Set(data.analysts.map((a) => a.analystId)))

  const colorByAnalyst = useMemo(() => {
    const m = new Map<number, string>()
    data.analysts.forEach((a, i) => m.set(a.analystId, PALETTE[i % PALETTE.length]))
    return m
  }, [data.analysts])

  const consensus = useMemo(() => consensusMedian(data.analysts), [data.analysts])

  const series: TargetSeries[] = useMemo(() => {
    const base: TargetSeries[] = [
      { key: 'consensus', label: '컨센서스(중앙값)', points: consensus, emphasis: true, color: CONSENSUS_COLOR },
    ]
    for (const a of data.analysts) {
      if (selected.has(a.analystId)) {
        base.push({ key: `a${a.analystId}`, label: a.name, points: a.points, color: colorByAnalyst.get(a.analystId) })
      }
    }
    return base
  }, [consensus, data.analysts, selected, colorByAnalyst])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        최신가 <span className="font-medium text-foreground">{fmt.price(data.latestPrice)}</span> ·{' '}
        {data.analysts.length}명이 예측. <span className="font-medium text-foreground">실제 주가</span>(굵은 선),{' '}
        <span className="font-medium" style={{ color: CONSENSUS_COLOR }}>컨센서스(중앙값)</span>, 그리고 각 애널리스트의
        목표가(<span className="font-medium text-foreground">색깔별 점선</span>)를 모두 함께 표시합니다.
        아래 칩을 눌러 개별로 끄고 켤 수 있습니다.
      </p>

      <TargetLinesChart prices={data.prices} series={series} height={320} showLegend={false} />

      {/* 애널리스트 선택 칩 (색 = 차트 선 색) */}
      <div className="flex flex-wrap gap-1.5">
        {data.analysts.map((a) => {
          const on = selected.has(a.analystId)
          const color = colorByAnalyst.get(a.analystId)!
          return (
            <button
              key={a.analystId}
              onClick={() => toggle(a.analystId)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 min-h-[32px] text-xs transition-colors',
                on ? 'border-transparent text-white' : 'hover:bg-muted text-foreground'
              )}
              style={on ? { backgroundColor: color } : undefined}
              aria-pressed={on}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: on ? 'white' : color }}
                aria-hidden
              />
              {a.name}
              <span className={cn('tabular-nums', on ? 'text-white/80' : hitRateTone(a.hitRate))}>
                {pct(a.hitRate)}
              </span>
            </button>
          )
        })}
      </div>

      {/* 요약 표 — 리포트 수·적중·빗나감·적중률·최신 목표가 */}
      <div className="divide-y divide-border/50 border-t pt-1">
        {data.analysts.map((a) => (
          <div key={a.analystId} className="flex items-start gap-2 py-2 text-sm">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorByAnalyst.get(a.analystId) }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{a.firm}</span>
                </span>
                <span className={cn('shrink-0 text-right text-xs font-semibold tabular-nums', hitRateTone(a.hitRate))}>
                  적중률 {pct(a.hitRate)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                <span>리포트 {a.reportCount}</span>
                <span aria-hidden>·</span>
                <span className="text-emerald-600 dark:text-emerald-400">적중 {a.hits}</span>
                <span aria-hidden>·</span>
                <span className="text-rose-600 dark:text-rose-400">빗나감 {a.misses}</span>
                <span aria-hidden>·</span>
                <span>최신 목표 <span className="font-medium text-foreground">{fmt.price(a.latestTarget)}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
