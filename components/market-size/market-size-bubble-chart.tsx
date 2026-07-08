'use client'

import { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import {
  CHART_AXIS,
  CHART_AXIS_LINE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '@/lib/chart-colors'

export interface BubblePoint {
  id: string
  name: string
  /** X — 매출 성장률 (%) */
  x: number
  /** Y — 목표주가 상승여력 (%) */
  y: number
  /** Z — 시총 (USD) */
  z: number
  tickerCount: number
  revenueSum: number | null
  revenueWith: number
  revenueTotal: number
}

export interface BubbleGroup {
  key: string
  label: string
  color: string
  points: BubblePoint[]
}

interface Props {
  groups: BubbleGroup[]
  onSelect?: (id: string) => void
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

export function MarketSizeBubbleChart({ groups, onSelect }: Props) {
  const fmt = useCurrencyFormat()

  // 극단값(회복 스파이크·이상 데이터)이 축을 잡아늘여 버블이 몰리는 것을 방지.
  // 양축 모두 견고한 상한(상위 75% × 1.6, 최소 40%)에 초과 버블을 고정(툴팁엔 실제값 유지).
  // 도메인은 정수로 반올림하고 양끝에 여백을 둬 가장자리 버블이 잘리지 않게 한다.
  const { plotGroups, xDomain, yDomain, median, colors } = useMemo(() => {
    const colors = Array.from(new Set(groups.map((g) => g.color)))
    const xs = groups.flatMap((g) => g.points.map((p) => p.x)).sort((a, b) => a - b)
    const ys = groups.flatMap((g) => g.points.map((p) => p.y)).sort((a, b) => a - b)
    if (xs.length === 0) {
      return {
        plotGroups: groups,
        xDomain: [0, 40] as [number, number],
        yDomain: [0, 40] as [number, number],
        median: null as number | null,
        colors,
      }
    }
    const q = (arr: number[], p: number) =>
      arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]
    const capOf = (arr: number[]) => Math.max(q(arr, 0.75) * 1.6, 40)
    const xCap = capOf(xs)
    const yCap = capOf(ys)
    const median = Math.round(q(xs, 0.5))
    const xMin = Math.min(0, xs[0])
    const yMin = Math.min(0, ys[0])
    const xRange = xCap - xMin || 1
    const yRange = yCap - yMin || 1
    const xDomain: [number, number] = [
      Math.floor(xMin - xRange * 0.05),
      Math.ceil(xCap + xRange * 0.07),
    ]
    const yDomain: [number, number] = [Math.floor(yMin), Math.ceil(yCap + yRange * 0.12)]
    const plotGroups = groups.map((g) => ({
      ...g,
      points: g.points.map((p) => ({
        ...p,
        xPlot: Math.min(p.x, xCap),
        yPlot: Math.min(p.y, yCap),
      })),
    }))
    return { plotGroups, xDomain, yDomain, median, colors }
  }, [groups])

  const hasAny = groups.some((g) => g.points.length > 0)
  if (!hasAny) {
    return (
      <div className="h-96 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">
          성장률·상승여력 데이터가 있는 항목이 없습니다
        </span>
      </div>
    )
  }

  return (
    <div className="h-[30rem] w-full [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 28, right: 44, bottom: 32, left: 8 }}>
          <defs>
            {colors.map((c, i) => (
              // 몸통은 solid, 테두리 약 12%만 부드럽게 페이드.
              <radialGradient key={c} id={`msGrad-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                <stop offset="88%" stopColor={c} stopOpacity={0.9} />
                <stop offset="100%" stopColor={c} stopOpacity={0.45} />
              </radialGradient>
            ))}
          </defs>
          <ReferenceLine y={0} stroke={CHART_AXIS_LINE} strokeDasharray="3 3" />
          {median != null && (
            <ReferenceLine
              x={median}
              stroke={CHART_AXIS_LINE}
              strokeDasharray="4 4"
              label={{
                value: '성장률 중앙값',
                position: 'top',
                fontSize: 10,
                fill: CHART_AXIS,
              }}
            />
          )}
          <XAxis
            type="number"
            dataKey="xPlot"
            name="매출 성장률"
            unit="%"
            domain={xDomain}
            allowDataOverflow
            allowDecimals={false}
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS_LINE }}
            label={{
              value: '매출 성장률 →',
              position: 'insideBottom',
              offset: -18,
              fontSize: 11,
              fill: CHART_AXIS,
            }}
          />
          <YAxis
            type="number"
            dataKey="yPlot"
            name="목표주가 상승여력"
            unit="%"
            domain={yDomain}
            allowDataOverflow
            allowDecimals={false}
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS_LINE }}
            label={{
              value: '상승여력 →',
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fill: CHART_AXIS,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[700, 9000]} name="시총" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as BubblePoint
              return (
                <div
                  style={CHART_TOOLTIP_CONTENT_STYLE}
                  className="space-y-0.5 text-foreground px-3 py-2"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div>시총 {fmt.marketCap(p.z)}</div>
                  <div>매출 성장률 {fmtPct(p.x)}</div>
                  <div>상승여력 {fmtPct(p.y)}</div>
                  <div>
                    매출{' '}
                    {p.revenueSum != null
                      ? `${fmt.marketCap(p.revenueSum)} (${p.revenueWith}/${p.revenueTotal}개)`
                      : '데이터 없음'}
                  </div>
                  <div className="text-muted-foreground">
                    종목 {p.tickerCount}개
                  </div>
                </div>
              )
            }}
          />
          {plotGroups.map((g) => (
            <Scatter
              key={g.key}
              name={g.label}
              data={g.points}
              fill={`url(#msGrad-${colors.indexOf(g.color)})`}
              fillOpacity={1}
              stroke="none"
              onClick={(d: unknown) => {
                const point = d as { id?: string } | undefined
                if (point?.id && onSelect) onSelect(point.id)
              }}
              className={onSelect ? 'cursor-pointer' : undefined}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
