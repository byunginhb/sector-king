'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useMoneyFlow } from '@/hooks/use-money-flow'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { FlowCard } from '@/components/money-flow/flow-card'
import { FlowSummary } from '@/components/money-flow/flow-summary'
import { SectorTrendSection } from '@/components/sector-trend/sector-trend-section'
import { SectorCompanyList } from '@/components/money-flow/sector-company-list'
import { AnimatePresence } from 'framer-motion'
import { IndustryTitle } from '@/components/industry-title'
import { SearchTrigger } from '@/components/search-trigger'
import { HelpButton } from '@/components/onboarding/help-button'
import { ShareButton } from '@/components/share-button'
import { RegionToggle } from '@/components/region-toggle'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import { cn } from '@/lib/utils'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'

type PeriodType = 1 | 3 | 7 | 14 | 30

interface MoneyFlowPageContentProps {
  industryId: string
}

export function MoneyFlowPageContent({ industryId }: MoneyFlowPageContentProps) {
  const [period, setPeriod] = useState<PeriodType>(14)
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null)
  const { region, setRegion } = useRegion()
  const { data, isLoading, error } = useMoneyFlow({ period, limit: 20, industryId, region })
  usePageTour('money-flow')

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href={`/${industryId}`}
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
                  <Wallet className="h-6 w-6 text-foreground" aria-hidden />
                  <IndustryTitle industryId={industryId} /> 섹터 자금 흐름
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {data?.dateRange
                    ? `${data.dateRange.start} ~ ${data.dateRange.end}`
                    : '섹터별 자금 유입/유출 현황'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <RegionToggle value={region} onChange={setRegion} />
              <ShareButton
                title="섹터 자금 흐름 | Sector King"
                description="섹터별 자금 유입/유출 현황 분석"
              />
              <SearchTrigger />
              <HelpButton pageId="money-flow" />
              {/* Period Selector */}
              <div data-tour="period-selector" className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
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

        {/* Empty state (region 필터로 모두 사라진 경우) */}
        {data && data.flows.length === 0 && !isLoading && (
          <EmptyRegionState region={region} />
        )}

        {/* Flow Cards */}
        {data && data.flows.length > 0 && (
          <>
            {/* Inflows Section */}
            {inflowFlows.length > 0 && (
              <div data-tour="inflow-section" className="mb-8">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
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
              <div data-tour="outflow-section" className="mb-8">
                <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
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

        {/* Sector Trend Section */}
        <div className="mt-8">
          <SectorTrendSection industryId={industryId} />
        </div>
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
