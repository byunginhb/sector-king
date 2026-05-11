'use client'

import { useState, useMemo } from 'react'
import { useMoneyFlow } from '@/hooks/use-money-flow'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { FlowCard } from '@/components/money-flow/flow-card'
import { FlowSummary } from '@/components/money-flow/flow-summary'
import { SectorTrendSection } from '@/components/sector-trend/sector-trend-section'
import { SectorCompanyList } from '@/components/money-flow/sector-company-list'
import { AnimatePresence } from 'framer-motion'
import { IndustryTitle } from '@/components/industry-title'
import { RegionToggle } from '@/components/region-toggle'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { IndustryContextBar } from '@/components/layout/industry-context-bar'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

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
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        pageId="money-flow"
        shareTitle="섹터 자금 흐름 | Sector King"
        shareDescription="섹터별 자금 유입/유출 현황 분석"
        subtitle={
          <span>
            <IndustryTitle industryId={industryId} /> 섹터 자금 흐름
            {data?.dateRange ? ` · ${data.dateRange.start} ~ ${data.dateRange.end}` : ''}
          </span>
        }
      />
      <IndustryContextBar
        industryId={industryId}
        rightActions={
          <>
            <RegionToggle value={region} onChange={setRegion} />
            <div data-tour="period-selector" className="flex rounded-lg overflow-hidden border border-border-subtle" role="group" aria-label="기간 선택">
              {([1, 3, 7, 14, 30] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  className={cn(
                    'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors tabular-nums',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  )}
                >
                  {p}일
                </button>
              ))}
            </div>
          </>
        }
      />

      <main className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-surface-2 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-danger">{error.message}</p>
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
                <h2 className="text-lg font-semibold text-success mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" aria-hidden />
                  자금 유입 섹터
                  <span className="text-sm font-normal text-success/80 ml-2">
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
                <h2 className="text-lg font-semibold text-danger mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-danger" aria-hidden />
                  자금 유출 섹터
                  <span className="text-sm font-normal text-danger/80 ml-2">
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
            region={region}
            onClose={() => setExpandedSectorId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
