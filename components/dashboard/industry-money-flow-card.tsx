'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp as TrendingUpIcon } from 'lucide-react'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount, formatKrw } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { CardError } from './card-error'
import type { IndustryMoneyFlowSummary, RegionFilter } from '@/types'

type PeriodType = 1 | 3 | 7 | 14 | 30

/* ─── Rising / Falling Arrow Animations ─── */

function RisingArrow({ index, delay, total }: { index: number; delay: number; total: number }) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, bottom: -10 }}
      initial={{ y: 30, opacity: 0 }}
      animate={{
        y: -120,
        opacity: [0, 0.85, 0.85, 0],
      }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
        <path d="M10 0 L19 12 L13 12 L13 30 L7 30 L7 12 L1 12 Z" fill="rgba(16, 185, 129, 0.7)" />
      </svg>
    </motion.div>
  )
}

function FallingArrow({ index, delay, total }: { index: number; delay: number; total: number }) {
  const x = 5 + (index / total) * 80 + Math.random() * 10
  const size = 20 + Math.random() * 12

  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ left: `${x}%`, top: -10 }}
      initial={{ y: -30, opacity: 0 }}
      animate={{
        y: 120,
        opacity: [0, 0.85, 0.85, 0],
      }}
      transition={{
        duration: 1.1 + Math.random() * 0.4,
        delay: delay + index * 0.3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg width={size} height={size * 1.5} viewBox="0 0 20 30" fill="none">
        <path d="M7 0 L13 0 L13 18 L19 18 L10 30 L1 18 L7 18 Z" fill="rgba(244, 63, 94, 0.7)" />
      </svg>
    </motion.div>
  )
}

/* ─── Main Card Component ─── */

interface IndustryMoneyFlowCardProps {
  region?: RegionFilter
}

export function IndustryMoneyFlowCard({ region = 'all' }: IndustryMoneyFlowCardProps = {}) {
  const [period, setPeriod] = useState<PeriodType>(14)
  const { data, isLoading, error } = useIndustryMoneyFlow({ period, region })

  if (isLoading) return <IndustryMoneyFlowCardSkeleton />
  if (error || !data) return <CardError message="산업별 자금 흐름을 불러올 수 없습니다" />
  if (data.industries.length === 0) return null

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 overflow-hidden">
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
          </div>
        </div>
        <p className="num-mono text-[10px] text-muted-foreground mt-1">
          최근 {data.period}일 · {data.dateRange.start} → {data.dateRange.end}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {data.industries.map((industry, i) => (
          <IndustryFlowItem key={industry.industryId} industry={industry} index={i} />
        ))}
      </div>
    </div>
  )
}

/* ─── Animated Flow Item ─── */

function IndustryFlowItem({
  industry,
  index,
}: {
  industry: IndustryMoneyFlowSummary
  index: number
}) {
  const isInflow = industry.flowDirection === 'in'

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
          animate={{ opacity: isInflow ? [0.2, 0.7, 0.2] : [0.3, 0.6, 0.3] }}
          transition={{ duration: isInflow ? 1.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inflow glow border effect */}
        {isInflow && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.15), 0 0 15px rgba(16, 185, 129, 0.1)',
            }}
            animate={{
              boxShadow: [
                'inset 0 0 20px rgba(16, 185, 129, 0.1), 0 0 10px rgba(16, 185, 129, 0.05)',
                'inset 0 0 25px rgba(16, 185, 129, 0.25), 0 0 20px rgba(16, 185, 129, 0.15)',
                'inset 0 0 20px rgba(16, 185, 129, 0.1), 0 0 10px rgba(16, 185, 129, 0.05)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Rising / Falling arrows (5~7 random) */}
        {isInflow
          ? Array.from({ length: 5 + (index % 3) }).map((_, i, arr) => (
              <RisingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arr.length} />
            ))
          : Array.from({ length: 5 + (index % 3) }).map((_, i, arr) => (
              <FallingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arr.length} />
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
              {isInflow ? '+' : '-'}{formatFlowAmount(Math.abs(industry.netFlow))}
            </div>
            <div
              className={cn(
                'text-xs opacity-70 tabular-nums',
                isInflow ? 'text-success' : 'text-danger'
              )}
            >
              ({formatKrw(industry.netFlow)})
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
                {formatFlowAmount(industry.totalInflow)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-muted-foreground">유출</span>
              <span className="font-medium text-card-foreground tabular-nums">
                {formatFlowAmount(industry.totalOutflow)}
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
    <div className="rounded-xl border border-border-subtle bg-card overflow-hidden">
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
