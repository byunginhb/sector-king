'use client'

/**
 * 월간 리포트 — 이달의 일별 시장 흐름(#28).
 * 추적 종목 시총의 기간 시작 대비 누적 % 라인 + 급등·급락일 마커.
 * 급등/급락일에 그날 데일리 리포트가 있으면 링크 칩으로 연결한다.
 *
 * 라이브 조회 데이터라 [data-pdf-block] 을 붙이지 않는다(PDF 캡처 제외).
 */
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { CHART_POSITIVE, CHART_NEGATIVE, CHART_AXIS } from '@/lib/chart-colors'
import type { DailyMarketResponse, DailyMarketPoint } from '@/types'

const AXIS_TICK = { fill: CHART_AXIS, fontSize: 11 }

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
function fmtMd(date: string): string {
  return date.slice(5).replace('-', '/')
}

/** 급등/급락일 칩 — 뉴스 있으면 링크, 없으면 정적 표기. */
function MoverChip({
  kind,
  point,
}: {
  kind: 'spike' | 'drop'
  point: DailyMarketPoint
}) {
  const isUp = kind === 'spike'
  const Icon = isUp ? TrendingUp : TrendingDown
  const label = isUp ? '급등일' : '급락일'
  const tone = isUp ? 'text-success' : 'text-danger'
  const dayPct = point.dayPct ?? 0

  const inner = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="num-mono text-sm font-semibold text-foreground tabular-nums">
        {fmtMd(point.date)}
      </span>
      <span className={`num-mono text-xs font-semibold tabular-nums ${tone}`}>
        {fmtPct(dayPct)}
      </span>
      {point.newsId && (
        <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-info">
          그날 리포트 <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      )}
    </>
  )

  const cls =
    'flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2'

  if (point.newsId) {
    return (
      <Link
        href={`/news/${point.newsId}`}
        className={`${cls} transition-colors hover:bg-surface-2`}
        title={point.newsTitle ?? undefined}
      >
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

export function DailyMarketChart({ data }: { data: DailyMarketResponse }) {
  const { points, spikeDate, dropDate } = data
  if (points.length < 2) return null

  const spike = spikeDate ? points.find((p) => p.date === spikeDate) : undefined
  const drop = dropDate ? points.find((p) => p.date === dropDate) : undefined

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={fmtMd}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${(v as number).toFixed(0)}%`}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value) => [fmtPct(value as number), '기간 대비']}
                labelFormatter={(l) => fmtMd(l as string)}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  color: 'hsl(var(--popover-foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="hsl(var(--primary))"
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 3 }}
              />
              {spike && (
                <ReferenceDot x={spike.date} y={spike.pct} r={4} fill={CHART_POSITIVE} stroke="none" />
              )}
              {drop && (
                <ReferenceDot x={drop.date} y={drop.pct} r={4} fill={CHART_NEGATIVE} stroke="none" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(spike || drop) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {spike && <MoverChip kind="spike" point={spike} />}
          {drop && <MoverChip kind="drop" point={drop} />}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        기간 내 매 거래일 데이터가 있는 종목만 골라(구성 변화 왜곡 방지) 시총 합의 시작일 대비
        누적 변화를 그렸어요. 초록·빨강 점은 전일 대비 가장 크게 오르내린 날이며, 그날 데일리
        리포트가 있으면 눌러서 볼 수 있어요. 월 전체 수치는 집계 방식 차이로 상단 요약치와 소폭
        다를 수 있어요.
      </p>
    </div>
  )
}
