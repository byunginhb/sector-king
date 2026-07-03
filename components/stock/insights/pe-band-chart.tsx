'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Gauge } from 'lucide-react'
import {
  CHART_PRIMARY,
  CHART_AXIS,
  CHART_AXIS_LINE,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '@/lib/chart-colors'
import { cn } from '@/lib/utils'
import type { PeBand } from '@/types'

interface PeBandChartProps {
  band: PeBand
}

/** percentile → 밸류에이션 구간(자기 이력 대비). 낮을수록 상대적으로 쌈. */
function zoneOf(percentile: number): { label: string; tone: string } {
  if (percentile <= 25) return { label: '저평가 구간', tone: 'text-success' }
  if (percentile >= 75) return { label: '고평가 구간', tone: 'text-warning' }
  return { label: '중립 구간', tone: 'text-muted-foreground' }
}

/**
 * PER 밴드 — 종목 자체 PER 이력의 25~75 백분위(정상 밴드) + 중앙값 대비 현재 위치.
 * ScoreTrendChart 의 recharts/차트색 패턴 차용. 데이터 없는 종목은 호출부에서 미렌더.
 */
export function PeBandChart({ band }: PeBandChartProps) {
  const chartData = useMemo(
    () =>
      band.history.map((h) => ({
        pe: h.pe,
        dateLabel: new Date(h.date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [band.history]
  )

  const zone = zoneOf(band.percentile)
  const fmt = (v: number) => v.toFixed(1)

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Gauge className="h-4 w-4" aria-hidden />
          PER 밴드
          <span className="text-xs font-normal text-muted-foreground">
            최근 {band.history.length}거래일
          </span>
        </h2>
        <p className="num-mono text-xs text-muted-foreground">
          현재 <span className={cn('font-medium', zone.tone)}>{fmt(band.current)}</span>
          <span className="mx-1">·</span>밴드 {fmt(band.low)}~{fmt(band.high)}
          <span className="mx-1">·</span>중앙값 {fmt(band.median)}
        </p>
      </div>

      <figure className="m-0">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              {/* 정상 밴드(25~75 백분위) 음영 */}
              <ReferenceArea
                y1={band.low}
                y2={band.high}
                fill={CHART_PRIMARY}
                fillOpacity={0.08}
                ifOverflow="extendDomain"
              />
              {/* 중앙값 기준선 */}
              <ReferenceLine
                y={band.median}
                stroke={CHART_AXIS}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: CHART_AXIS }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: CHART_AXIS }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value) => [`PER ${(value as number).toFixed(1)}`, '']}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              />
              <Line
                type="monotone"
                dataKey="pe"
                stroke={CHART_PRIMARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'white' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          현재 PER {fmt(band.current)}는 과거 이력 백분위{' '}
          <span className={cn('font-medium', zone.tone)}>{Math.round(band.percentile)}%</span> —{' '}
          <span className={cn('font-medium', zone.tone)}>{zone.label}</span>. 음영은 25~75 백분위
          정상 밴드, 점선은 중앙값입니다.
        </figcaption>
      </figure>
    </section>
  )
}
