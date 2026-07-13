'use client'

/**
 * 월간 리포트 — 이달의 일별 시장 흐름(#28).
 * 추적 종목 시총의 기간 시작 대비 누적 % 라인 + 최고/최저 지점 표기 + 급등·급락일.
 * 급등/급락일은 그날 리포트의 전문가 요약을 인라인 노출하고, 상세는 링크로만 이동(뎁스 최소화).
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
import { Skeleton } from '@/components/ui/skeleton'
import type { DailyMarketResponse, DailyMarketMover } from '@/types'

const AXIS_TICK = { fill: CHART_AXIS, fontSize: 11 }

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
function fmtPct1(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}
function fmtMd(date: string): string {
  return date.slice(5).replace('-', '/')
}

/** 급등/급락일 카드 — 그날 전문가 요약 인라인 + 상세는 링크로만. */
function MoverCard({ kind, mover }: { kind: 'spike' | 'drop'; mover: DailyMarketMover }) {
  const isUp = kind === 'spike'
  const Icon = isUp ? TrendingUp : TrendingDown
  const tone = isUp ? 'text-success' : 'text-danger'

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
        <span className="text-xs text-muted-foreground">{isUp ? '급등일' : '급락일'}</span>
        <span className="num-mono text-sm font-semibold text-foreground tabular-nums">
          {fmtMd(mover.date)}
        </span>
        <span className={`num-mono text-xs font-semibold tabular-nums ${tone}`}>
          {fmtPct(mover.dayPct)}
        </span>
      </div>

      {mover.oneLine && (
        <p className="mt-2 text-[13px] font-medium leading-snug text-foreground">
          {mover.oneLine}
        </p>
      )}
      {mover.brief && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {mover.brief}
        </p>
      )}

      {mover.newsId ? (
        <Link
          href={`/news/${mover.newsId}`}
          className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-info hover:underline"
        >
          그날 리포트 상세 보기 <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">그날 발행된 리포트가 없어요.</p>
      )}
    </div>
  )
}

/** 로딩 중 영역을 잡아두는 스켈레톤 — 실제 차트+카드 레이아웃과 동일 치수. */
export function DailyMarketChartSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-border-subtle bg-surface-1 p-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1.5 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-5/6" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function DailyMarketChart({ data }: { data: DailyMarketResponse }) {
  const { points, spike, drop } = data
  if (points.length < 2) return null

  // 최고/최저 지점(누적 라인의 정점·저점) — 그래프에 값 표기.
  const maxPoint = points.reduce((a, b) => (b.pct > a.pct ? b : a))
  const minPoint = points.reduce((a, b) => (b.pct < a.pct ? b : a))

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
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
              {/* 최고/최저 지점 — 값 라벨 표기 */}
              <ReferenceDot
                x={maxPoint.date}
                y={maxPoint.pct}
                r={3}
                fill="hsl(var(--muted-foreground))"
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
                label={{
                  value: `최고 ${fmtPct1(maxPoint.pct)}`,
                  position: 'top',
                  fill: 'hsl(var(--foreground))',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <ReferenceDot
                x={minPoint.date}
                y={minPoint.pct}
                r={3}
                fill="hsl(var(--muted-foreground))"
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
                label={{
                  value: `최저 ${fmtPct1(minPoint.pct)}`,
                  position: 'bottom',
                  fill: 'hsl(var(--foreground))',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              {/* 급등/급락일 — 전일대비 최대 변동일 */}
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
          {spike && <MoverCard kind="spike" mover={spike} />}
          {drop && <MoverCard kind="drop" mover={drop} />}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        기간 내 매 거래일 데이터가 있는 종목만 골라(구성 변화 왜곡 방지) 시총 합의 시작일 대비
        누적 변화를 그렸어요. 회색 점은 이 기간의 최고·최저 지점, 초록·빨강 점은 전일 대비 가장
        크게 오르내린 날이에요. 월 전체 수치는 집계 방식 차이로 상단 요약치와 소폭 다를 수 있어요.
      </p>
    </div>
  )
}
