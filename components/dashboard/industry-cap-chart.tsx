'use client'

import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts'
import { CHART_POSITIVE, CHART_NEGATIVE, CHART_AXIS } from '@/lib/chart-colors'

interface IndustryCapChartProps {
  /** 오래된 → 최신 시총 시계열 */
  data: number[]
  trend: 'up' | 'down' | 'flat'
  /** 값 포맷터(통화 인지) — 호버 툴팁 표기용 */
  format: (v: number) => string
  ariaLabel?: string
}

interface Point {
  i: number
  value: number
  /** '오늘' | 'N일 전' */
  label: string
}

/** 호버 시 해당 시점의 실제 시총과 상대 일자를 표기. */
function CapTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean
  payload?: Array<{ payload: Point }>
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border-subtle bg-background px-2.5 py-1.5 shadow-sm">
      <p className="text-[10px] text-muted-foreground">{p.label}</p>
      <p className="num-mono text-xs font-semibold text-foreground">
        {format(p.value)}
      </p>
    </div>
  )
}

/**
 * 산업 카드의 메인 시각요소 — 14일 시총 추세 영역 차트.
 * x축은 차트 아래 "N일 전 / 오늘" 간이 라벨로만 대략 표기하고, 실제 값은 호버 툴팁으로 노출.
 * ponytail: 카드 그리드(소수)라 recharts 사용 허용 — 큰 인터랙티브 차트가 요구사항.
 */
export function IndustryCapChart({
  data,
  trend,
  format,
  ariaLabel,
}: IndustryCapChartProps) {
  const gradId = useId().replace(/:/g, '')
  const points = useMemo<Point[]>(() => {
    const n = data.length
    return data.map((value, i) => {
      const daysAgo = n - 1 - i
      return { i, value, label: daysAgo === 0 ? '오늘' : `${daysAgo}일 전` }
    })
  }, [data])

  const color =
    trend === 'up' ? CHART_POSITIVE : trend === 'down' ? CHART_NEGATIVE : CHART_AXIS
  const n = points.length

  return (
    <div className="w-full">
      <div className="h-24 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`icc-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              content={<CapTooltip format={format} />}
              cursor={{ stroke: CHART_AXIS, strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#icc-${gradId})`}
              dot={false}
              activeDot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {n >= 2 && (
        <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>{n - 1}일 전</span>
          <span>오늘</span>
        </div>
      )}
    </div>
  )
}
