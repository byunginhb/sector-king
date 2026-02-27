'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount } from '@/lib/format'
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-3">
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
                      'px-3 py-1.5 text-sm transition-colors',
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
      <div className={cn('text-2xl font-bold', s.value)}>
        {prefix}{formatFlowAmount(Math.abs(amount))}
      </div>
    </div>
  )
}

function InflowParticle({ index, delay }: { index: number; delay: number }) {
  const startX = -60 - Math.random() * 40
  const startY = 30 + Math.random() * 60
  const endX = 80 + Math.random() * 60
  const endY = 40 + Math.random() * 40

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0.3 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.3, 1.3, 1.1, 0.8, 0],
        rotate: [0, 15, 5, -5, 0],
      }}
      transition={{
        duration: 2.5,
        delay: delay + index * 0.5,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    >
      💵
    </motion.div>
  )
}

function OutflowParticle({ index, delay }: { index: number; delay: number }) {
  const startX = 100 + Math.random() * 60
  const startY = 40 + Math.random() * 40
  const endX = 280 + Math.random() * 40
  const endY = 20 + Math.random() * 80

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0.5, 0],
        scale: [0.8, 1.2, 1, 0.6, 0.2],
        rotate: [0, 20, 45, 70, 90],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.4 + 0.2,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.15, 0.5, 0.8, 1],
      }}
    >
      💸
    </motion.div>
  )
}

function CoinInflowParticle({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = -40 - Math.random() * 30
  const startY = 40 + Math.random() * 50
  const endX = 70 + Math.random() * 50
  const endY = 50 + Math.random() * 30

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: '0 2px 10px rgba(251, 191, 36, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 1, 0],
        scale: [0.2, 1.2, 1, 0.3],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.35,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.25, 0.7, 1],
      }}
    />
  )
}

function CoinOutflowParticle({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = 100 + Math.random() * 40
  const startY = 50 + Math.random() * 30
  const endX = 270 + Math.random() * 30
  const endY = 30 + Math.random() * 60

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
        boxShadow: '0 2px 10px rgba(148, 163, 184, 0.6)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, endX],
        y: [startY, endY],
        opacity: [0, 1, 0.8, 0],
        scale: [0.8, 1.1, 0.7, 0.2],
      }}
      transition={{
        duration: 1.8,
        delay: delay + index * 0.3 + 0.15,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.2, 0.6, 1],
      }}
    />
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
  const particleCount = 2
  const coinCount = 2

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

        {/* Particles */}
        {isInflow ? (
          <>
            {Array.from({ length: particleCount }).map((_, i) => (
              <InflowParticle key={`p-${i}`} index={i} delay={index * 0.15} />
            ))}
            {Array.from({ length: coinCount }).map((_, i) => (
              <CoinInflowParticle key={`c-${i}`} index={i} delay={index * 0.1} />
            ))}
          </>
        ) : (
          <>
            {Array.from({ length: particleCount }).map((_, i) => (
              <OutflowParticle key={`p-${i}`} index={i} delay={index * 0.15} />
            ))}
            {Array.from({ length: coinCount }).map((_, i) => (
              <CoinOutflowParticle key={`c-${i}`} index={i} delay={index * 0.1} />
            ))}
          </>
        )}

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: isInflow ? [0, 10, 0] : [0, -10, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {industry.industryIcon || (isInflow ? '💰' : '💸')}
              </motion.span>
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
              <motion.div
                className={cn(
                  'text-2xl font-bold',
                  isInflow
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isInflow ? '+' : '-'}
                {formatFlowAmount(Math.abs(industry.netFlow))}
              </motion.div>
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
            <motion.div
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                isInflow
                  ? 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-200 dark:bg-rose-800/50 text-rose-700 dark:text-rose-300'
              )}
              animate={{ x: isInflow ? [5, 0, 5] : [-5, 0, -5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isInflow ? (
                <>
                  <span>유입</span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </>
              ) : (
                <>
                  <motion.span
                    animate={{ x: [0, -3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    ←
                  </motion.span>
                  <span>유출</span>
                </>
              )}
            </motion.div>
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
