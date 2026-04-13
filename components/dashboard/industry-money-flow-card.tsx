'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount, formatKrw } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'
import type { IndustryMoneyFlowSummary } from '@/types'

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
        <path d="M10 0 L19 12 L13 12 L13 30 L7 30 L7 12 L1 12 Z" fill="rgba(239, 68, 68, 0.7)" />
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
        <path d="M7 0 L13 0 L13 18 L19 18 L10 30 L1 18 L7 18 Z" fill="rgba(59, 130, 246, 0.7)" />
      </svg>
    </motion.div>
  )
}

/* ─── Main Card Component ─── */

export function IndustryMoneyFlowCard() {
  const [period, setPeriod] = useState<PeriodType>(14)
  const { data, isLoading, error } = useIndustryMoneyFlow({ period })

  if (isLoading) return <IndustryMoneyFlowCardSkeleton />
  if (error || !data) return <CardError message="산업별 자금 흐름을 불러올 수 없습니다" />
  if (data.industries.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            산업별 자금 흐름
          </h3>
          <div className="flex items-center gap-2">
            {/* Period Filter */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {([1, 3, 7, 14, 30] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2 py-1 text-xs transition-colors',
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-card text-muted-foreground hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                >
                  {p}일
                </button>
              ))}
            </div>
            <Link
              href="/industry-money-flow"
              className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
            >
              전체 보기 →
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          최근 {data.period}일 기준 ({data.dateRange.start} ~ {data.dateRange.end})
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
          'relative rounded-lg p-4 min-h-[120px] overflow-hidden cursor-pointer transition-shadow',
          isInflow
            ? 'bg-linear-to-br from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-900/30 border border-red-200 dark:border-red-800'
            : 'bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800'
        )}
      >
        {/* Background pulse */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg',
            isInflow ? 'bg-red-400/10' : 'bg-blue-400/10'
          )}
          animate={{ opacity: isInflow ? [0.2, 0.7, 0.2] : [0.3, 0.6, 0.3] }}
          transition={{ duration: isInflow ? 1.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inflow glow border effect */}
        {isInflow && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.15), 0 0 15px rgba(239, 68, 68, 0.1)',
            }}
            animate={{
              boxShadow: [
                'inset 0 0 20px rgba(239, 68, 68, 0.1), 0 0 10px rgba(239, 68, 68, 0.05)',
                'inset 0 0 25px rgba(239, 68, 68, 0.25), 0 0 20px rgba(239, 68, 68, 0.15)',
                'inset 0 0 20px rgba(239, 68, 68, 0.1), 0 0 10px rgba(239, 68, 68, 0.05)',
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
            {industry.industryIcon && (
              <span className="text-xl">
                {industry.industryIcon}
              </span>
            )}
            <span className="font-semibold text-card-foreground truncate">
              {industry.industryName}
            </span>
            <span
              className={cn(
                'ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                isInflow
                  ? 'bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                  : 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300'
              )}
            >
              {isInflow ? '유입 ↑' : '유출 ↓'}
            </span>
          </div>

          {/* Net flow */}
          <div className="mb-3">
            <div
              className={cn(
                'text-base sm:text-xl font-bold',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
            >
              {isInflow ? '+' : '-'}{formatFlowAmount(Math.abs(industry.netFlow))}
            </div>
            <div
              className={cn(
                'text-xs opacity-70',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
            >
              ({formatKrw(industry.netFlow)})
            </div>
            <div
              className={cn(
                'text-sm',
                isInflow
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-blue-500 dark:text-blue-400'
              )}
            >
              {isInflow ? '+' : ''}{industry.netFlowPercent.toFixed(1)}%
            </div>
          </div>

          {/* Inflow / Outflow details */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">유입</span>
              <span className="font-medium text-card-foreground">
                {formatFlowAmount(industry.totalInflow)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">유출</span>
              <span className="font-medium text-card-foreground">
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-44" />
        </div>
        <Skeleton className="h-3 w-56 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
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
