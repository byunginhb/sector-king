'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useMoneyFlow } from '@/hooks/use-money-flow'
import { FlowCard } from '@/components/money-flow/flow-card'
import { FlowSummary } from '@/components/money-flow/flow-summary'
import { SectorCompanyList } from '@/components/money-flow/sector-company-list'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type PeriodType = 1 | 3 | 7 | 14 | 30

export default function MoneyFlowPage() {
  const [period, setPeriod] = useState<PeriodType>(14)
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null)
  const { data, isLoading, error } = useMoneyFlow({ period, limit: 20 })

  const expandedFlow = data?.flows.find((f) => f.id === expandedSectorId)

  const inflowFlows = useMemo(
    () => data?.flows.filter((f) => f.flowDirection === 'in') ?? [],
    [data?.flows]
  )
  const outflowFlows = useMemo(
    () => data?.flows.filter((f) => f.flowDirection === 'out') ?? [],
    [data?.flows]
  )

  function handleCardClick(sectorId: string) {
    setExpandedSectorId((prev) => (prev === sectorId ? null : sectorId))
  }

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

            <div className="flex items-center gap-3">
              <Link
                href="/sector-trend"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors"
              >
                📈 섹터추이
              </Link>
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
        {/* Onboarding */}
        <div className="mb-6 bg-linear-to-r from-gray-50 to-slate-100 dark:from-gray-900/50 dark:to-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            이 페이지는 무엇인가요?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            섹터별 <strong>시가총액 변화</strong>를 통해 자금의 흐름을 시각화합니다.
            <span className="text-red-600 dark:text-red-400 font-medium"> 레드 카드</span>는 자금 유입(시가총액 증가),
            <span className="text-blue-600 dark:text-blue-400 font-medium"> 블루 카드</span>는 자금 유출(시가총액 감소)을 나타냅니다.
            💵가 카드 안으로 들어오면 유입, 💸가 카드 밖으로 나가면 유출입니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>💰 유입 (시총 증가)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>💸 유출 (시총 감소)</span>
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

        {/* Flow Cards */}
        {data && (
          <>
            {/* Inflows Section */}
            {inflowFlows.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  자금 유입 섹터
                  <span className="text-sm font-normal text-red-500 dark:text-red-400 ml-2">
                    돈이 들어오는 중...
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inflowFlows.slice(0, 6).map((flow, index) => (
                    <FlowCard
                      key={flow.id}
                      flow={flow}
                      index={index}
                      maxFlow={data.flows[0]?.flowAmount || 1}
                      onClick={() => handleCardClick(flow.id)}
                      isExpanded={expandedSectorId === flow.id}
                    />
                  ))}
                </div>

              </div>
            )}

            {/* Outflows Section */}
            {outflowFlows.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <span className="text-xl">💸</span>
                  자금 유출 섹터
                  <span className="text-sm font-normal text-blue-500 dark:text-blue-400 ml-2">
                    돈이 빠져나가는 중...
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outflowFlows.slice(0, 6).map((flow, index) => (
                    <FlowCard
                      key={flow.id}
                      flow={flow}
                      index={index}
                      maxFlow={data.flows[0]?.flowAmount || 1}
                      onClick={() => handleCardClick(flow.id)}
                      isExpanded={expandedSectorId === flow.id}
                    />
                  ))}
                </div>

              </div>
            )}

            {/* Summary */}
            <FlowSummary
              totalInflow={data.totalInflow}
              totalOutflow={data.totalOutflow}
              netFlow={data.netFlow}
            />
          </>
        )}
      </main>

      {/* Sector Company Modal */}
      <AnimatePresence>
        {expandedFlow && (
          <SectorCompanyList
            sectorId={expandedFlow.id}
            sectorName={expandedFlow.name}
            period={period}
            flowDirection={expandedFlow.flowDirection}
            onClose={() => setExpandedSectorId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
