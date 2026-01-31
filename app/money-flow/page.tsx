'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMoneyFlow } from '@/hooks/use-money-flow'
import { FlowRiver } from '@/components/money-flow/flow-river'
import { FlowSummary } from '@/components/money-flow/flow-summary'
import { cn } from '@/lib/utils'

type PeriodType = 1 | 7 | 14 | 30

export default function MoneyFlowPage() {
  const [period, setPeriod] = useState<PeriodType>(14)
  const { data, isLoading, error } = useMoneyFlow({ period, limit: 6 })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  섹터 자금 흐름
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {data?.dateRange
                    ? `${data.dateRange.start} ~ ${data.dateRange.end}`
                    : '섹터별 자금 유입/유출 현황'}
                </p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
              {([1, 7, 14, 30] as PeriodType[]).map((p) => (
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Onboarding */}
        <div className="mb-6 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            이 페이지는 무엇인가요?
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
            섹터별 <strong>시가총액 변화</strong>를 통해 자금의 흐름을 시각화합니다.
            <span className="text-emerald-600 dark:text-emerald-400 font-medium"> 초록색 물줄기</span>는 자금 유입(시가총액 증가),
            <span className="text-red-600 dark:text-red-400 font-medium"> 빨간색 물줄기</span>는 자금 유출(시가총액 감소)을 나타냅니다.
            물줄기가 <strong>굵을수록</strong> 더 많은 자금이 이동했음을 의미합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>유입 (시총 증가)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>유출 (시총 감소)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">MFI</span>
              <span>= Money Flow Index (50 이상: 매수 우위)</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error.message}</p>
          </div>
        )}

        {/* Flow Rivers */}
        {data && (
          <>
            <div className="mb-8 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <span className="text-xl">🌊</span>
                자금 흐름 TOP {data.flows.length}
              </h2>

              <div className="space-y-6">
                {data.flows.map((flow, index) => (
                  <FlowRiver key={flow.id} flow={flow} index={index} maxFlow={data.flows[0]?.flowAmount || 1} />
                ))}
              </div>
            </div>

            {/* Summary */}
            <FlowSummary
              totalInflow={data.totalInflow}
              totalOutflow={data.totalOutflow}
              netFlow={data.netFlow}
            />
          </>
        )}
      </main>
    </div>
  )
}
