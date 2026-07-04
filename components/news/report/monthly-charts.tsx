'use client'

/**
 * 월간 리포트 전용 차트 (recharts). 발행 시점에 박제된 JSONB 숫자만 사용(라이브 조회 X).
 *
 * dataviz 규칙: 자금흐름·등락은 부호(polarity)가 핵심 → 발산(diverging) 막대.
 * 색상 단독 의존 금지 → 0 기준 좌/우 위치 + 부호 라벨 + 값 라벨로 식별 보강
 * (색맹 안전). 축·라벨 텍스트는 시리즈색이 아닌 텍스트 토큰(회색).
 */
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ReferenceLine,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CHART_POSITIVE, CHART_NEGATIVE, CHART_AXIS } from '@/lib/chart-colors'
import type { MonthlySectorFlow, MonthlyMover } from '@/drizzle/supabase-schema'

const AXIS_TICK = { fill: CHART_AXIS, fontSize: 11 }

function fmtBn(v: number): string {
  return `${v >= 0 ? '+' : '−'}$${Math.abs(v / 1e9).toFixed(0)}B`
}
function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`
}

const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface-1, #fff)',
    border: '1px solid var(--border-subtle, #e2e8f0)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--foreground, #0f172a)', fontWeight: 600 },
}

/** 섹터 자금흐름 — 유입(+)/유출(−) 발산 막대. flowUsd 내림차순. */
export function SectorFlowChart({ data }: { data: MonthlySectorFlow[] }) {
  const rows = [...data].sort((a, b) => b.flowUsd - a.flowUsd)
  const height = Math.max(220, rows.length * 34 + 40)
  // 최장 바가 축까지 닿아 값 라벨이 섹터명과 겹치지 않도록 대칭 도메인에 25% 여백.
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.flowUsd)))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 64, bottom: 8, left: 8 }}
      >
        <XAxis
          type="number"
          domain={[-maxAbs * 1.25, maxAbs * 1.25]}
          tickFormatter={(v) => fmtBn(Number(v))}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={92}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke={CHART_AXIS} />
        <Tooltip {...tooltipStyle} formatter={(value) => fmtBn(Number(value))} />
        <Bar dataKey="flowUsd" radius={4} isAnimationActive={false} barSize={20}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.flowUsd >= 0 ? CHART_POSITIVE : CHART_NEGATIVE} />
          ))}
          <LabelList
            dataKey="flowUsd"
            position="right"
            formatter={(value) => fmtBn(Number(value))}
            style={{ fill: CHART_AXIS, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** 월간 등락 top movers — 상승(+, 초록)/하락(−, 빨강) 발산 막대. */
export function MoversChart({
  gainers,
  losers,
}: {
  gainers: MonthlyMover[]
  losers: MonthlyMover[]
}) {
  // 상단=상승 내림차순, 하단=하락 오름차순(가장 큰 낙폭이 맨 아래)
  const rows = [
    ...[...gainers].sort((a, b) => b.pct - a.pct),
    ...[...losers].sort((a, b) => b.pct - a.pct),
  ]
  const height = Math.max(220, rows.length * 30 + 40)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 56, bottom: 8, left: 12 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => fmtPct(Number(v))}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={116}
          tick={{ fill: CHART_AXIS, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke={CHART_AXIS} />
        <Tooltip {...tooltipStyle} formatter={(value) => fmtPct(Number(value))} />
        <Bar dataKey="pct" radius={4} isAnimationActive={false} barSize={18}>
          {rows.map((r) => (
            <Cell key={r.code} fill={r.pct >= 0 ? CHART_POSITIVE : CHART_NEGATIVE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
