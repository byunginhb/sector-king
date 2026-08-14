'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp as TrendingUpIcon, Zap, ZapOff } from 'lucide-react'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'
import { buildTrendPath } from '@/lib/trend-path'
import { Skeleton } from '@/components/ui/skeleton'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { CardError } from './card-error'
import type { IndustryMoneyFlowSummary, RegionFilter } from '@/types'

type PeriodType = 1 | 3 | 7 | 14 | 30

/* ─── Rising / Falling Arrow Animations ─── */

interface ArrowProps {
  index: number
  delay: number
  total: number
  /** 이 카드만의 애니메이션 정지 — 멈춰도 화살표는 고정 위치에 그대로 보인다. */
  paused: boolean
}

function RisingArrow({ index, delay, total, paused }: ArrowProps) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12
  const icon = (
    <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
      <path d="M10 0 L19 12 L13 12 L13 30 L7 30 L7 12 L1 12 Z" fill="hsl(var(--success) / 0.7)" />
    </svg>
  )

  if (paused) {
    return (
      <div
        className="absolute pointer-events-none z-10"
        style={{ left: `${x}%`, top: `${18 + (index / total) * 52}%`, opacity: 0.5 }}
      >
        {icon}
      </div>
    )
  }

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, bottom: -10 }}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: -120, opacity: [0, 0.85, 0.85, 0] }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {icon}
    </motion.div>
  )
}

function FallingArrow({ index, delay, total, paused }: ArrowProps) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12
  const icon = (
    <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
      <path d="M7 0 L13 0 L13 18 L19 18 L10 30 L1 18 L7 18 Z" fill="hsl(var(--danger) / 0.7)" />
    </svg>
  )

  if (paused) {
    return (
      <div
        className="absolute pointer-events-none z-10"
        style={{ left: `${x}%`, top: `${18 + (index / total) * 52}%`, opacity: 0.5 }}
      >
        {icon}
      </div>
    )
  }

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, top: -10 }}
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 120, opacity: [0, 0.85, 0.85, 0] }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {icon}
    </motion.div>
  )
}

/* ─── Cumulative Flow Background Chart ─── */

/**
 * 기간 내 일별 누적 순유입 추이를 카드 전체 배경으로 깐다.
 * 마지막 점 = 카드에 적힌 순유입액이라 숫자와 그래프가 같은 이야기를 한다.
 * 글씨(z-10)보다 아래 레이어에 두고 불투명도를 낮춰 가독성을 지킨다.
 */
function FlowTrendBackground({
  trend,
  dates,
  isInflow,
  gradientId,
}: {
  trend: number[] | undefined
  dates: string[] | undefined
  isInflow: boolean
  gradientId: string
}) {
  const path = useMemo(() => buildTrendPath(trend ?? []), [trend])
  const extremes = useMemo(() => findExtremes(trend, dates), [trend, dates])
  if (!path) return null

  const color = isInflow ? 'hsl(var(--success))' : 'hsl(var(--danger))'

  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={path.area} fill={`url(#${gradientId})`} />
        <path
          d={path.line}
          fill="none"
          stroke={color}
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 최고·최저 날짜 — SVG 는 가로로 늘어나므로(preserveAspectRatio=none)
          글자가 찌그러지지 않게 HTML 레이어에 올린다. */}
      {extremes.map(({ kind, index, label }) => {
        const point = path.points[index]
        return (
          <span
            key={kind}
            className="absolute z-0 pointer-events-none whitespace-nowrap text-[9px] tabular-nums opacity-45"
            style={{
              color,
              left: `${point.x}%`,
              top: `${point.y}%`,
              // 카드 밖으로 잘리지 않게 양 끝에서는 안쪽으로 붙인다(테두리에 딱 붙지 않게 4px 여유).
              transform: `translateX(${point.x < 12 ? '4px' : point.x > 88 ? 'calc(-100% - 4px)' : '-50%'}) translateY(${kind === 'max' ? '3px' : '-100%'})`,
            }}
          >
            {label}
          </span>
        )
      })}
    </>
  )
}

/**
 * 누적 추이의 최고점·최저점 (동률이면 먼저 찍힌 날).
 *
 * 첫 점(index 0)은 제외한다 — 누적값이 정의상 0 이라 계속 오르기만 한 산업은
 * 첫날이 자동으로 "최저"가 되는데, 그건 시작일일 뿐 정보가 아니고 헤더의
 * 기간 표기와 중복되며 카드 좌하단 모서리에 잘려 박힌다.
 * 점이 3개 미만이면 양 끝이 곧 최고·최저라 통째로 생략한다.
 */
function findExtremes(
  trend: number[] | undefined,
  dates: string[] | undefined
): { kind: 'max' | 'min'; index: number; label: string }[] {
  if (!trend || !dates || trend.length < 3 || dates.length !== trend.length) return []

  let maxIdx = 0
  let minIdx = 0
  for (let i = 1; i < trend.length; i++) {
    if (trend[i] > trend[maxIdx]) maxIdx = i
    if (trend[i] < trend[minIdx]) minIdx = i
  }
  if (maxIdx === minIdx) return []

  // 'YYYY-MM-DD' → 'MM.DD'
  const label = (i: number) => dates[i].slice(5).replace('-', '.')
  return [
    { kind: 'max' as const, index: maxIdx, label: label(maxIdx) },
    { kind: 'min' as const, index: minIdx, label: label(minIdx) },
  ].filter((e) => e.index > 0)
}

/* ─── Main Card Component ─── */

interface IndustryMoneyFlowCardProps {
  region?: RegionFilter
}

export function IndustryMoneyFlowCard({ region = 'all' }: IndustryMoneyFlowCardProps = {}) {
  const [period, setPeriod] = useState<PeriodType>(14)
  // 이 카드만의 애니메이션 정지(전역 아님 — 마켓 티커 등 다른 곳에는 영향 없음).
  const [paused, setPaused] = useState(false)
  const { data, isLoading, error } = useIndustryMoneyFlow({ period, region })

  if (isLoading) return <IndustryMoneyFlowCardSkeleton />
  if (error || !data) return <CardError message="산업별 자금 흐름을 불러올 수 없습니다" />
  if (data.industries.length === 0) return null

  return (
    <div className="sk-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-subtle bg-surface-2/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-accent mb-1 flex items-center gap-1.5">
              <TrendingUpIcon className="w-3 h-3 text-success shrink-0" aria-hidden />
              Industry Money Flow
            </p>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-tight">
              산업별 자금 흐름
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              기간 시가총액 변화 기준 · 실제 순매수 자금이 아닙니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period Filter */}
            <div role="group" aria-label="기간 선택" className="flex rounded-lg overflow-hidden border border-border-subtle">
              {([1, 3, 7, 14, 30] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  className={cn(
                    'px-2 py-1 text-xs transition-colors tabular-nums',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  )}
                >
                  {p}일
                </button>
              ))}
            </div>
            {/* 이 카드 애니메이션만 끄고 켜는 토글 (멈춰도 화살표는 그대로 보임) */}
            <button
              type="button"
              onClick={() => setPaused((prev) => !prev)}
              aria-pressed={paused}
              title={paused ? '애니메이션 켜기' : '애니메이션 끄기'}
              aria-label={paused ? '애니메이션 켜기' : '애니메이션 끄기'}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-subtle text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {paused ? (
                <ZapOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Zap className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
        </div>
        <p className="num-mono text-[10px] text-muted-foreground mt-1">
          최근 {data.period}일 · {data.dateRange.start} → {data.dateRange.end}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {data.industries.map((industry, i) => (
          <IndustryFlowItem
            key={industry.industryId}
            industry={industry}
            dates={data.dates}
            index={i}
            paused={paused}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Animated Flow Item ─── */

function IndustryFlowItem({
  industry,
  dates,
  index,
  paused,
}: {
  industry: IndustryMoneyFlowSummary
  dates: string[]
  index: number
  paused: boolean
}) {
  const isInflow = industry.flowDirection === 'in'
  const fmt = useCurrencyFormat()

  return (
    <Link href={`/${industry.industryId}/money-flow`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: index * 0.1 }}
        className={cn(
          'relative rounded-lg p-4 min-h-[120px] overflow-hidden cursor-pointer transition-shadow border',
          isInflow
            ? 'bg-success/5 border-success/30'
            : 'bg-danger/5 border-danger/30'
        )}
      >
        {/* Background pulse */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg',
            isInflow ? 'bg-success/10' : 'bg-danger/10'
          )}
          animate={paused ? { opacity: 0.45 } : { opacity: isInflow ? [0.2, 0.7, 0.2] : [0.3, 0.6, 0.3] }}
          transition={paused ? { duration: 0 } : { duration: isInflow ? 1.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inflow glow border effect */}
        {isInflow && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.15), 0 0 15px rgba(16, 185, 129, 0.1)',
            }}
            animate={
              paused
                ? undefined
                : {
                    boxShadow: [
                      'inset 0 0 20px rgba(16, 185, 129, 0.1), 0 0 10px rgba(16, 185, 129, 0.05)',
                      'inset 0 0 25px rgba(16, 185, 129, 0.25), 0 0 20px rgba(16, 185, 129, 0.15)',
                      'inset 0 0 20px rgba(16, 185, 129, 0.1), 0 0 10px rgba(16, 185, 129, 0.05)',
                    ],
                  }
            }
            transition={paused ? { duration: 0 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 기간 내 누적 순유입 추이 (배경) */}
        <FlowTrendBackground
          trend={industry.trend}
          dates={dates}
          isInflow={isInflow}
          gradientId={`flow-trend-${industry.industryId}`}
        />

        {/* Rising / Falling arrows (5~7 random) */}
        {isInflow
          ? Array.from({ length: 5 + (index % 3) }).map((_, i, arr) => (
              <RisingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arr.length} paused={paused} />
            ))
          : Array.from({ length: 5 + (index % 3) }).map((_, i, arr) => (
              <FallingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arr.length} paused={paused} />
            ))}

        {/* Content */}
        <div className="relative z-10">
          {/* Industry header */}
          <div className="flex items-center gap-2 mb-3">
            <IndustryIcon
              iconKey={industry.industryId}
              className={cn(
                'h-5 w-5 shrink-0',
                isInflow ? 'text-success' : 'text-danger'
              )}
            />
            <span className="font-semibold text-card-foreground truncate">
              {industry.industryName}
            </span>
            <span
              className={cn(
                'ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                isInflow
                  ? 'bg-success/15 text-success'
                  : 'bg-danger/15 text-danger'
              )}
            >
              {isInflow ? '유입 ↑' : '유출 ↓'}
            </span>
          </div>

          {/* Net flow */}
          <div className="mb-3">
            <div
              className={cn(
                'text-base sm:text-xl font-bold tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              {isInflow ? '+' : '-'}{fmt.flowAmount(Math.abs(industry.netFlow))}
            </div>
            <div
              className={cn(
                'text-sm tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              {isInflow ? '+' : ''}{industry.netFlowPercent.toFixed(1)}%
            </div>
          </div>

          {/* Inflow / Outflow details */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground">유입</span>
              <span className="font-medium text-card-foreground tabular-nums">
                {fmt.flowAmount(industry.totalInflow)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-muted-foreground">유출</span>
              <span className="font-medium text-card-foreground tabular-nums">
                {fmt.flowAmount(industry.totalOutflow)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

/* ─── Skeleton ─── */

function IndustryMoneyFlowCardSkeleton() {
  return (
    <div className="sk-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-44" />
        </div>
        <Skeleton className="h-3 w-56 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-10 ml-auto rounded-full" />
            </div>
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
