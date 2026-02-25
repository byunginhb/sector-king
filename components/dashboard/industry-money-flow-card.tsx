'use client'

import Link from 'next/link'
import { useIndustryMoneyFlow } from '@/hooks/use-industry-money-flow'
import { formatFlowAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'
import type { IndustryMoneyFlowSummary } from '@/types'

export function IndustryMoneyFlowCard() {
  const { data, isLoading, error } = useIndustryMoneyFlow()

  if (isLoading) return <IndustryMoneyFlowCardSkeleton />
  if (error || !data) return <CardError message="산업별 자금 흐름을 불러올 수 없습니다" />
  if (data.industries.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            산업별 자금 흐름
          </h3>
          <Link
            href="/industry-money-flow"
            className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            전체 보기 →
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          최근 {data.period}일 기준 ({data.dateRange.start} ~ {data.dateRange.end})
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {data.industries.map((industry) => (
          <IndustryFlowItem key={industry.industryId} industry={industry} />
        ))}
      </div>
    </div>
  )
}

function IndustryFlowItem({ industry }: { industry: IndustryMoneyFlowSummary }) {
  const isInflow = industry.flowDirection === 'in'

  return (
    <Link
      href={`/${industry.industryId}/money-flow`}
      className={cn(
        'group block rounded-lg border p-4 transition-all hover:shadow-md',
        isInflow
          ? 'border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700'
          : 'border-rose-200 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-700'
      )}
    >
      {/* Industry header */}
      <div className="flex items-center gap-2 mb-3">
        {industry.industryIcon && (
          <span className="text-xl">{industry.industryIcon}</span>
        )}
        <span className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
          {industry.industryName}
        </span>
        <span
          className={cn(
            'ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
            isInflow
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
          )}
        >
          {isInflow ? '유입' : '유출'}
        </span>
      </div>

      {/* Net flow */}
      <div className="mb-3">
        <div
          className={cn(
            'text-xl font-bold',
            isInflow
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {isInflow ? '+' : '-'}{formatFlowAmount(Math.abs(industry.netFlow))}
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

      {/* Inflow / Outflow details */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">유입</span>
          <span className="font-medium text-card-foreground">
            {formatFlowAmount(industry.totalInflow)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">유출</span>
          <span className="font-medium text-card-foreground">
            {formatFlowAmount(industry.totalOutflow)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function IndustryMoneyFlowCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <Skeleton className="h-6 w-48" />
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
