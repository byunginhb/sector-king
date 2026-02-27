'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'
import type { IndustryMoneyFlowSummary } from '@/types'

type PeriodType = 1 | 3 | 7 | 14 | 30

/* ─── Inflow Particle Components (Enhanced) ─── */

function InflowParticle({ index, delay }: { index: number; delay: number }) {
  const startX = -40 - Math.random() * 30
  const startY = 15 + Math.random() * 60
  const midX = 40 + Math.random() * 60
  const midY = startY + (Math.random() - 0.5) * 30
  const endX = 120 + Math.random() * 80
  const endY = 20 + Math.random() * 50

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0.2 }}
      animate={{
        x: [startX, midX, endX],
        y: [startY, midY, endY],
        opacity: [0, 1, 1, 0.7, 0],
        scale: [0.2, 1.4, 1.2, 0.8, 0],
        rotate: [0, 20, 10, -10, 0],
      }}
      transition={{
        duration: 3,
        delay: delay + index * 0.6,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.15, 0.4, 0.75, 1],
      }}
    >
      💵
    </motion.div>
  )
}

function InflowSparkle({ index, delay }: { index: number; delay: number }) {
  const x = 20 + Math.random() * 160
  const y = 10 + Math.random() * 80

  return (
    <motion.div
      className="absolute pointer-events-none z-20"
      style={{
        left: x,
        top: y,
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: '#fbbf24',
        boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.8), 0 0 12px 4px rgba(239, 68, 68, 0.4)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0.8, 0],
        scale: [0, 1.5, 1, 0],
      }}
      transition={{
        duration: 1.2,
        delay: delay + index * 0.4,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  )
}

function OutflowParticle({ index, delay }: { index: number; delay: number }) {
  const startX = 30 + Math.random() * 40
  const startY = 20 + Math.random() * 40
  const midX = 150 + Math.random() * 40
  const endX = 300 + Math.random() * 60
  const endY = startY + (Math.random() - 0.3) * 30

  return (
    <motion.div
      className="absolute text-2xl pointer-events-none select-none z-20"
      style={{ left: 0, top: 0 }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 1 }}
      animate={{
        x: [startX, midX, endX],
        y: [startY, startY - 5, endY],
        opacity: [0, 1, 0.9, 0.4, 0],
        scale: [0.9, 1.2, 1, 0.7, 0.3],
        rotate: [0, 15, 35, 60, 90],
      }}
      transition={{
        duration: 2.2,
        delay: delay + index * 0.5 + 0.2,
        repeat: Infinity,
        ease: [0.4, 0, 1, 1],
        times: [0, 0.15, 0.45, 0.75, 1],
      }}
    >
      💸
    </motion.div>
  )
}

function CoinInflowParticle({ index, delay }: { index: number; delay: number }) {
  const size = 10 + Math.random() * 6
  const startX = -30 - Math.random() * 25
  const startY = 20 + Math.random() * 50
  const midX = 30 + Math.random() * 50
  const endX = 100 + Math.random() * 60
  const endY = 25 + Math.random() * 40

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 40%, #f59e0b 100%)',
        boxShadow: '0 2px 12px rgba(251, 191, 36, 0.7), 0 0 6px rgba(251, 191, 36, 0.4)',
      }}
      initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
      animate={{
        x: [startX, midX, endX],
        y: [startY, startY - 10, endY],
        opacity: [0, 1, 1, 0.6, 0],
        scale: [0.2, 1.3, 1.1, 0.5, 0],
      }}
      transition={{
        duration: 2.5,
        delay: delay + index * 0.4,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    />
  )
}

function CoinOutflowParticle({ index, delay }: { index: number; delay: number }) {
  const size = 9 + Math.random() * 5
  const startX = 40 + Math.random() * 40
  const startY = 25 + Math.random() * 35
  const midX = 140 + Math.random() * 40
  const endX = 280 + Math.random() * 50
  const endY = startY + (Math.random() - 0.3) * 25

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
        x: [startX, midX, endX],
        y: [startY, startY - 5, endY],
        opacity: [0, 1, 0.8, 0.3, 0],
        scale: [0.8, 1.1, 0.8, 0.3, 0],
      }}
      transition={{
        duration: 2,
        delay: delay + index * 0.35 + 0.15,
        repeat: Infinity,
        ease: [0.4, 0, 1, 1],
        times: [0, 0.15, 0.5, 0.8, 1],
      }}
    />
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2 shrink-0">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Particles */}
        {isInflow ? (
          <>
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 z-[5] pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(239, 68, 68, 0.15) 45%, rgba(251, 191, 36, 0.1) 50%, transparent 55%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            />
            {/* 3 money emoji particles */}
            {Array.from({ length: 3 }).map((_, i) => (
              <InflowParticle key={`p-${i}`} index={i} delay={index * 0.15} />
            ))}
            {/* 2 gold coin particles */}
            {Array.from({ length: 2 }).map((_, i) => (
              <CoinInflowParticle key={`c-${i}`} index={i} delay={index * 0.1} />
            ))}
            {/* 3 sparkles */}
            {Array.from({ length: 3 }).map((_, i) => (
              <InflowSparkle key={`s-${i}`} index={i} delay={index * 0.12} />
            ))}
          </>
        ) : (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <OutflowParticle key={`p-${i}`} index={i} delay={index * 0.15} />
            ))}
            {Array.from({ length: 2 }).map((_, i) => (
              <CoinOutflowParticle key={`c-${i}`} index={i} delay={index * 0.1} />
            ))}
          </>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Industry header */}
          <div className="flex items-center gap-2 mb-3">
            {industry.industryIcon && (
              <motion.span
                className={cn('text-xl', isInflow && 'text-2xl')}
                animate={
                  isInflow
                    ? {
                        scale: [1, 1.35, 1.1, 1.3, 1],
                        rotate: [0, 12, -5, 8, 0],
                      }
                    : {
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 0],
                      }
                }
                transition={{
                  duration: isInflow ? 2 : 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {industry.industryIcon}
              </motion.span>
            )}
            <span className="font-semibold text-card-foreground truncate">
              {industry.industryName}
            </span>
            <motion.span
              className={cn(
                'ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                isInflow
                  ? 'bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                  : 'bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300'
              )}
              animate={{ x: isInflow ? [3, 0, 3] : [-3, 0, -3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isInflow ? '유입 →' : '← 유출'}
            </motion.span>
          </div>

          {/* Net flow */}
          <div className="mb-3">
            <motion.div
              className={cn(
                'text-xl font-bold',
                isInflow
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
              animate={
                isInflow
                  ? { scale: [1, 1.05, 1], textShadow: ['0 0 0px transparent', '0 0 8px rgba(239,68,68,0.4)', '0 0 0px transparent'] }
                  : { scale: [1, 1.02, 1] }
              }
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isInflow ? '+' : '-'}{formatFlowAmount(Math.abs(industry.netFlow))}
            </motion.div>
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
