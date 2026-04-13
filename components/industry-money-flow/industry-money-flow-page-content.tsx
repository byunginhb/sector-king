'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount, formatKrw } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchTrigger } from '@/components/search-trigger'
import { ShareButton } from '@/components/share-button'
import { ThemeToggle } from '@/components/theme-toggle'
import type { IndustryMoneyFlowSummary } from '@/types'

type PeriodType = 1 | 3 | 7 | 14 | 30

export function IndustryMoneyFlowPageContent() {
  const [period, setPeriod] = useState<PeriodType>(14)
  const { data, isLoading, error } = useIndustryMoneyFlow({ period })

  const inflowIndustries = useMemo(
    () => data?.industries.filter((i) => i.flowDirection === 'in') ?? [],
    [data?.industries]
  )
  const outflowIndustries = useMemo(
    () => data?.industries.filter((i) => i.flowDirection === 'out') ?? [],
    [data?.industries]
  )

  const totalInflow = useMemo(
    () => data?.industries.reduce((sum, i) => sum + i.totalInflow, 0) ?? 0,
    [data?.industries]
  )
  const totalOutflow = useMemo(
    () => data?.industries.reduce((sum, i) => sum + i.totalOutflow, 0) ?? 0,
    [data?.industries]
  )
  const netFlow = totalInflow - totalOutflow

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/"
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  산업별 자금 흐름
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {data?.dateRange
                    ? `${data.dateRange.start} ~ ${data.dateRange.end}`
                    : '산업별 자금 유입/유출 현황'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <ShareButton
                title="산업별 자금 흐름 | Sector King"
                description="산업별 자금 유입/유출 비교 분석"
              />
              <SearchTrigger />
              <ThemeToggle />
              {/* Period Selector */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
                {([1, 3, 7, 14, 30] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors',
                      period === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-card text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {p}일
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && <PageSkeleton />}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error.message}</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <SummaryCard
                label="총 유입"
                icon="📈"
                amount={totalInflow}
                variant="inflow"
              />
              <SummaryCard
                label="총 유출"
                icon="📉"
                amount={totalOutflow}
                variant="outflow"
              />
              <SummaryCard
                label="순 유입"
                icon="💰"
                amount={netFlow}
                variant={netFlow >= 0 ? 'net-positive' : 'net-negative'}
                showSign
              />
            </div>

            {/* Inflow Industries */}
            {inflowIndustries.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  자금 유입 산업
                  <span className="text-sm font-normal text-emerald-500 dark:text-emerald-400 ml-2">
                    {inflowIndustries.length}개 산업
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inflowIndustries.map((industry, i) => (
                    <IndustryFlowCard key={industry.industryId} industry={industry} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Outflow Industries */}
            {outflowIndustries.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">📉</span>
                  자금 유출 산업
                  <span className="text-sm font-normal text-rose-500 dark:text-rose-400 ml-2">
                    {outflowIndustries.length}개 산업
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outflowIndustries.map((industry, i) => (
                    <IndustryFlowCard key={industry.industryId} industry={industry} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
  label,
  icon,
  amount,
  variant,
  showSign = false,
}: {
  label: string
  icon: string
  amount: number
  variant: 'inflow' | 'outflow' | 'net-positive' | 'net-negative'
  showSign?: boolean
}) {
  const styles = {
    inflow: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      label: 'text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-700 dark:text-emerald-300',
    },
    outflow: {
      bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
      label: 'text-rose-600 dark:text-rose-400',
      value: 'text-rose-700 dark:text-rose-300',
    },
    'net-positive': {
      bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
      label: 'text-blue-600 dark:text-blue-400',
      value: 'text-blue-700 dark:text-blue-300',
    },
    'net-negative': {
      bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
      label: 'text-orange-600 dark:text-orange-400',
      value: 'text-orange-700 dark:text-orange-300',
    },
  }

  const s = styles[variant]
  const prefix = showSign ? (amount >= 0 ? '+' : '-') : (variant === 'outflow' ? '-' : '+')

  return (
    <div className={cn('rounded-xl border p-4', s.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className={cn('text-sm font-medium', s.label)}>{label}</span>
      </div>
      <div className={cn('text-xl sm:text-2xl font-bold', s.value)}>
        {prefix}{formatFlowAmount(Math.abs(amount))}
      </div>
      <div className={cn('text-sm opacity-70', s.value)}>
        ({formatKrw(amount)})
      </div>
    </div>
  )
}

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

function IndustryFlowCard({
  industry,
  index,
}: {
  industry: IndustryMoneyFlowSummary
  index: number
}) {
  const isInflow = industry.flowDirection === 'in'
  const arrowCount = 5 + (index % 3)

  return (
    <Link href={`/${industry.industryId}/money-flow`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: index * 0.1 }}
        className={cn(
          'relative rounded-xl p-5 min-h-[140px] overflow-hidden cursor-pointer transition-shadow',
          isInflow
            ? 'bg-linear-to-br from-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-800'
            : 'bg-linear-to-br from-rose-50 to-red-100 dark:from-rose-950/40 dark:to-red-900/30 border border-rose-200 dark:border-rose-800'
        )}
      >
        {/* Animated background pulse */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl',
            isInflow ? 'bg-emerald-400/10' : 'bg-rose-400/10'
          )}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Rising / Falling arrows */}
        {isInflow
          ? Array.from({ length: arrowCount }).map((_, i) => (
              <RisingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arrowCount} />
            ))
          : Array.from({ length: arrowCount }).map((_, i) => (
              <FallingArrow key={`a-${i}`} index={i} delay={index * 0.1} total={arrowCount} />
            ))}

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {industry.industryIcon || (isInflow ? '📈' : '📉')}
              </span>
              <div className="min-w-0">
                <span
                  className={cn(
                    'text-lg font-bold block truncate',
                    isInflow
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  )}
                >
                  {industry.industryName}
                </span>
                {industry.industryNameEn && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {industry.industryNameEn}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div
                className={cn(
                  'text-lg sm:text-2xl font-bold',
                  isInflow
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {isInflow ? '+' : '-'}
                {formatFlowAmount(Math.abs(industry.netFlow))}
              </div>
              <div
                className={cn(
                  'text-xs sm:text-sm opacity-70',
                  isInflow
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                ({formatKrw(industry.netFlow)})
              </div>
              <div
                className={cn(
                  'text-sm',
                  isInflow
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-rose-500 dark:text-rose-400'
                )}
              >
                {isInflow ? '+' : ''}{industry.netFlowPercent.toFixed(1)}%
              </div>
            </div>

            {/* Direction indicator */}
            <span
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                isInflow
                  ? 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-200 dark:bg-rose-800/50 text-rose-700 dark:text-rose-300'
              )}
            >
              {isInflow ? '유입 ↑' : '유출 ↓'}
            </span>
          </div>

          {/* Inflow / Outflow breakdown */}
          <div className="flex items-center gap-4 text-xs mt-3 pt-3 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-500 dark:text-slate-400">유입</span>
              <span className="font-medium text-gray-700 dark:text-slate-300">
                {formatFlowAmount(industry.totalInflow)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-gray-500 dark:text-slate-400">유출</span>
              <span className="font-medium text-gray-700 dark:text-slate-300">
                {formatFlowAmount(industry.totalOutflow)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-5 w-20 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-12 ml-auto rounded-full" />
              </div>
              <Skeleton className="h-8 w-36 mb-1" />
              <Skeleton className="h-4 w-16 mb-4" />
              <div className="flex gap-4 pt-3 border-t border-border">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
