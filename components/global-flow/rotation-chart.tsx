'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import {
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_AXIS, CHART_AXIS_LINE, CHART_TOOLTIP_CONTENT_STYLE } from '@/lib/chart-colors'
import type { RrgAsset } from '@/lib/global-flow/compute'
import type { Quadrant } from '@/lib/global-flow/rrg'
import { cn } from '@/lib/utils'
import { GROUP_COLOR, QUADRANT_DESC, QUADRANT_LABEL, shortDate } from './format'

interface Props {
  assets: RrgAsset[]
  focusId: string | null
  onFocus: (id: string) => void
}

interface PlotPoint {
  id: string
  name: string
  date: string
  x: number
  y: number
  isLast: boolean
  quadrant: Quadrant
}

/** 4사분면 — 시계 방향 회전 순서(개선 → 주도 → 둔화 → 약세). */
const QUADRANTS: { key: Quadrant; x: 'lo' | 'hi'; y: 'lo' | 'hi' }[] = [
  { key: 'improving', x: 'lo', y: 'hi' },
  { key: 'leading', x: 'hi', y: 'hi' },
  { key: 'weakening', x: 'hi', y: 'lo' },
  { key: 'lagging', x: 'lo', y: 'lo' },
]

const QUADRANT_FILL: Record<Quadrant, string> = {
  leading: 'hsl(var(--success))',
  weakening: 'hsl(var(--warning))',
  lagging: 'hsl(var(--danger))',
  improving: 'hsl(var(--info))',
}

/** 선택하지 않은 자산은 최근 몇 주만 — 13개 꼬리가 다 그려지면 가운데가 뭉개진다. */
const SHORT_TAIL = 3

/** 1·2·5 계열의 보기 좋은 눈금 간격. */
function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

/**
 * 100 을 가운데 둔 대칭 범위 + 눈금 5개. 사분면 크기가 같아야 위치를 눈으로 비교할 수 있다.
 * 크립토의 옛 꼬리 하나가 축을 넓혀 나머지를 뭉개지 않게 범위는 호출자가 고른 점으로만 잡는다.
 */
function symmetricAxis(values: number[]): { domain: [number, number]; ticks: number[] } {
  const d = Math.max(...values.map((v) => Math.abs(v - 100)), 0.5) * 1.1
  const step = niceStep(d / 2.5)
  const half = Math.ceil(d / step) * step
  const ticks: number[] = []
  for (let t = 100 - half; t <= 100 + half + 1e-9; t += step) ticks.push(Number(t.toFixed(6)))
  return { domain: [100 - half, 100 + half], ticks }
}

/** 11px 굵은 한글 기준 라벨 폭 근사(px). 점 오른쪽 8px 에서 시작한다. */
const labelWidth = (name: string) => name.length * 11 + 8

/**
 * 라벨 겹침 제거 — 중심에서 먼(=눈에 띄는) 점부터 라벨을 주고, 이미 붙은 라벨과 *픽셀* 기준으로
 * 겹치면 생략한다(이름은 범례·툴팁에 남는다). 선택한 자산은 항상 표시.
 * 픽셀로 재는 이유: 같은 데이터라도 모바일(약 300px)과 데스크탑(약 1100px)에서 겹침이 다르다.
 */
function pickLabels(
  lasts: PlotPoint[],
  span: { x: number; y: number },
  plot: { w: number; h: number },
  focusId: string | null,
): Set<string> {
  const px = (p: PlotPoint) => ({
    x: ((p.x - (100 - span.x / 2)) / span.x) * plot.w,
    y: ((100 + span.y / 2 - p.y) / span.y) * plot.h,
  })
  const kept: PlotPoint[] = []
  const order = [...lasts].sort(
    (a, b) =>
      Number(b.id === focusId) - Number(a.id === focusId) ||
      Math.hypot(b.x - 100, b.y - 100) - Math.hypot(a.x - 100, a.y - 100),
  )
  for (const p of order) {
    const a = px(p)
    const clash = kept.some((k) => {
      const b = px(k)
      // 라벨 상자 [x+8, x+8+w] × [y-7, y+7] 끼리의 교차 + 점 자체(반경 6)
      const overlapX =
        a.x + 2 < b.x + 8 + labelWidth(k.name) && b.x + 2 < a.x + 8 + labelWidth(p.name)
      return overlapX && Math.abs(a.y - b.y) < 14
    })
    if (!clash || p.id === focusId) kept.push(p)
  }
  return new Set(kept.map((p) => p.id))
}

// 차트 여백(margin + Y축 폭) — 픽셀 라벨 판정용. ScatterChart margin·YAxis width 와 맞출 것.
const PLOT_INSET = { w: 12 + 36, h: 8 + 24 + 30 }

/**
 * ④ 회전 궤적 (상대 회전 그래프, RRG 단순화판).
 * "어디서 어디로"에 대한 정직한 답 — 상대 강도가 어느 자산에서 빠져 어느 자산으로 옮겨가는지.
 */

export function RotationChart({ assets, focusId, onFocus }: Props) {
  const [size, setSize] = useState({ w: 800, h: 480 })
  // 라벨 겹침을 픽셀로 재려면 실제 크기가 필요하다. 콜백 ref + ResizeObserver(트리맵과 같은 패턴).
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (!box) return
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      setSize((cur) => (cur.w === w && cur.h === h ? cur : { w, h }))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [box])
  const { series, xAxis, yAxis, labeled } = useMemo(() => {
    const series = assets.map((a) => {
      const tail = focusId === a.id ? a.tail : a.tail.slice(-SHORT_TAIL)
      return {
        asset: a,
        points: tail.map<PlotPoint>((p, i) => ({
          id: a.id,
          name: a.name,
          date: p.date,
          x: p.x,
          y: p.y,
          isLast: i === tail.length - 1,
          quadrant: a.quadrant,
        })),
      }
    })
    const lasts = series.map((s) => s.points[s.points.length - 1]).filter(Boolean)
    // 범위 = 현재 점 + 선택한 자산의 궤적. 나머지 꼬리는 범위를 넘으면 잘린다(allowDataOverflow).
    const framed = [...lasts, ...(series.find((s) => s.asset.id === focusId)?.points ?? [])]
    const xAxis = symmetricAxis(framed.map((p) => p.x))
    const yAxis = symmetricAxis(framed.map((p) => p.y))
    const span = { x: xAxis.domain[1] - xAxis.domain[0], y: yAxis.domain[1] - yAxis.domain[0] }
    const plot = { w: Math.max(size.w - PLOT_INSET.w, 1), h: Math.max(size.h - PLOT_INSET.h, 1) }
    return { series, xAxis, yAxis, labeled: pickLabels(lasts, span, plot, focusId) }
  }, [assets, focusId, size])
  const xDomain = xAxis.domain
  const yDomain = yAxis.domain

  const bound = (axis: [number, number], side: 'lo' | 'hi') =>
    side === 'lo' ? ([axis[0], 100] as const) : ([100, axis[1]] as const)

  return (
    <div>
      <div ref={setBox} className="h-[22rem] w-full sm:h-[30rem] [&_*:focus]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
            {QUADRANTS.map((q) => {
              const [x1, x2] = bound(xDomain, q.x)
              const [y1, y2] = bound(yDomain, q.y)
              return (
                <ReferenceArea
                  key={q.key}
                  x1={x1}
                  x2={x2}
                  y1={y1}
                  y2={y2}
                  fill={QUADRANT_FILL[q.key]}
                  fillOpacity={0.05}
                  stroke="none"
                  label={{
                    value: QUADRANT_LABEL[q.key],
                    position: `inside${q.y === 'hi' ? 'Top' : 'Bottom'}${q.x === 'hi' ? 'Right' : 'Left'}`,
                    fontSize: 12,
                    fontWeight: 600,
                    fill: CHART_AXIS,
                  }}
                />
              )
            })}
            <ReferenceLine x={100} stroke={CHART_AXIS_LINE} />
            <ReferenceLine y={100} stroke={CHART_AXIS_LINE} />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              ticks={xAxis.ticks}
              allowDataOverflow
              tick={{ fontSize: 11, fill: CHART_AXIS }}
              tickFormatter={(v: number) => String(Number(v.toFixed(1)))}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              label={{
                value: '상대 강도 →',
                position: 'insideBottom',
                offset: -12,
                fontSize: 11,
                fill: CHART_AXIS,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              ticks={yAxis.ticks}
              allowDataOverflow
              tick={{ fontSize: 11, fill: CHART_AXIS }}
              tickFormatter={(v: number) => String(Number(v.toFixed(1)))}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              width={36}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as PlotPoint
                return (
                  <div
                    style={CHART_TOOLTIP_CONTENT_STYLE}
                    className="space-y-0.5 px-3 py-2 text-foreground"
                  >
                    <div className="font-semibold">
                      {p.name} · {shortDate(p.date)}
                    </div>
                    <div className="num-mono">
                      상대 강도 {p.x.toFixed(1)} · 모멘텀 {p.y.toFixed(1)}
                    </div>
                    {p.isLast && (
                      <div className="text-muted-foreground">
                        {QUADRANT_LABEL[p.quadrant]} — {QUADRANT_DESC[p.quadrant]}
                      </div>
                    )}
                  </div>
                )
              }}
            />
            {series.map(({ asset, points }) => {
              const color = GROUP_COLOR[asset.group]
              const dim = focusId != null && focusId !== asset.id
              return (
                <Scatter
                  key={asset.id}
                  data={points}
                  line={{ stroke: color, strokeOpacity: dim ? 0.12 : 0.55, strokeWidth: 1.5 }}
                  isAnimationActive={false}
                  onClick={() => onFocus(asset.id)}
                  className="cursor-pointer"
                  shape={(props: { cx?: number; cy?: number; payload?: PlotPoint }) => {
                    const { cx = 0, cy = 0, payload } = props
                    const opacity = dim ? 0.2 : 1
                    if (!payload?.isLast) {
                      return (
                        <circle cx={cx} cy={cy} r={2} fill={color} fillOpacity={opacity * 0.6} />
                      )
                    }
                    return (
                      <g opacity={opacity}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5.5}
                          fill={color}
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                        />
                        {labeled.has(payload.id) && (
                          <text
                            x={cx + 8}
                            y={cy + 4}
                            fontSize={11}
                            fontWeight={600}
                            fill="hsl(var(--foreground))"
                          >
                            {payload.name}
                          </text>
                        )}
                      </g>
                    )
                  }}
                />
              )
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 겸 선택 — 13개 꼬리가 겹치면 읽기 어려워 하나를 골라 강조한다. */}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="자산 선택">
        {assets.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onFocus(a.id)}
              aria-pressed={focusId === a.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                focusId === a.id
                  ? 'border-foreground bg-surface-2 text-foreground'
                  : 'border-border-subtle text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: GROUP_COLOR[a.group] }}
                aria-hidden
              />
              {a.name}
              <span className="text-[10px] text-muted-foreground">
                {QUADRANT_LABEL[a.quadrant]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
