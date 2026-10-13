'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  CHART_AXIS,
  CHART_PRIMARY,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '@/lib/chart-colors'
import type { GlobalFlowPayload, PeriodView } from '@/lib/global-flow/compute'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { fmtPct, shortDate, signed, toneOf } from './format'

interface Props {
  liquidity: NonNullable<GlobalFlowPayload['liquidity']>
  view: PeriodView
}

const DIR_TEXT = { up: '확대 중', down: '축소 중', flat: '횡보' } as const

/** ① 조류 — 연준 순유동성(총자산 − TGA − 역레포). 주간 발표. */
export function LiquidityPanel({ liquidity, view }: Props) {
  const fmt = useCurrencyFormat()
  const change = view.liquidityChangeUsd
  const dir = view.verdict.liquidity

  return (
    <div className="sk-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="eyebrow">① 조류</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">미국 순유동성</h2>
        </div>
        <p className="text-sm">
          <span className="num-mono text-lg font-semibold text-foreground">
            {fmt.marketCap(liquidity.latest.value)}
          </span>
          {change != null && (
            <span className={cn('ml-2 num-mono', toneOf(change))}>
              {signed(change, fmt.flowAmount)}
            </span>
          )}
          {dir && <span className="ml-2 text-muted-foreground">{DIR_TEXT[dir]}</span>}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        연준 총자산 − 재무부 계좌(TGA) − 역레포 · 주간 · 기준일 {liquidity.latest.date}
      </p>

      <div className="mt-4 h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={liquidity.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: CHART_AXIS }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => fmt.marketCap(v)}
              tick={{ fontSize: 11, fill: CHART_AXIS }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(v) => [fmt.marketCap(Number(v)), '순유동성']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_PRIMARY}
              fill={CHART_PRIMARY}
              fillOpacity={0.12}
              strokeWidth={2}
              // 진입 애니메이션이 ResponsiveContainer 첫 측정(0px)과 겹치면 영역이 비어 보인다(실측)
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-xs">
        {liquidity.m2 && (
          <div>
            <dt className="text-muted-foreground">
              미국 M2 통화량 ({liquidity.m2.date.slice(0, 7)})
            </dt>
            <dd className="mt-0.5 text-sm">
              <span className="num-mono text-foreground">{fmt.marketCap(liquidity.m2.latest)}</span>{' '}
              <span className={cn('num-mono', toneOf(liquidity.m2.yoyPct))}>
                전년比 {fmtPct(liquidity.m2.yoyPct)}
              </span>
            </dd>
          </div>
        )}
        {liquidity.mmfTotal && (
          <div>
            <dt className="text-muted-foreground">
              미국 MMF 총자산 ({liquidity.mmfTotal.date.slice(0, 7)})
            </dt>
            <dd className="mt-0.5 num-mono text-sm text-foreground">
              {fmt.marketCap(liquidity.mmfTotal.latest)}
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        늘면 시스템 전체에 돈이 풀리는 중, 줄면 거둬들이는 중입니다. 자산 가격과 함께 움직이는
        경우가 많지만 인과가 증명된 지표는 아닙니다.
      </p>
    </div>
  )
}
