'use client'

import { useState, useMemo } from 'react'
import { usePriceChanges } from '@/hooks/use-price-changes'
import { useTrends } from '@/hooks/use-statistics'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { PriceChangeChart } from '@/components/price-changes/price-change-chart'
import { PriceChangeTable } from '@/components/price-changes/price-change-table'
import { CompanyTrendChart } from '@/components/statistics/company-trend-chart'
import { CompanyDetail } from '@/components/company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IndustryTitle } from '@/components/industry-title'
import { RegionToggle } from '@/components/region-toggle'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { IndustryContextBar } from '@/components/layout/industry-context-bar'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import { cn } from '@/lib/utils'
import { BarChart3, LineChart as LineChartIcon, Table as TableIcon } from 'lucide-react'

type SortType = 'percentChange' | 'name' | 'marketCap'

interface PriceChangesPageContentProps {
  industryId: string
}

export function PriceChangesPageContent({ industryId }: PriceChangesPageContentProps) {
  const [sort, setSort] = useState<SortType>('percentChange')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const { region, setRegion } = useRegion()

  const { data, isLoading } = usePriceChanges({ sort, order, industryId, region })
  usePageTour('price-changes')

  // Get top 20 tickers for trend chart (memoized to avoid re-fetch loops)
  const topTickers = useMemo(
    () => data?.companies?.slice(0, 20).map((c) => c.ticker) || [],
    [data?.companies]
  )

  // Fetch price history for top 20 companies
  const { data: trendData, isLoading: trendLoading } = useTrends({
    type: 'company',
    ids: topTickers,
    days: 'all',
    industryId,
    region,
  })

  const handleSortChange = (newSort: SortType) => {
    if (newSort === sort) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(newSort)
      setOrder('desc')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        pageId="price-changes"
        shareTitle="가격 변화율 | Sector King"
        shareDescription="추적 기업 가격 변화율 분석"
        subtitle={
          <span>
            <IndustryTitle industryId={industryId} /> 가격 변화율
            {data?.dateRange ? ` · ${data.dateRange.start} ~ ${data.dateRange.end}` : ''}
          </span>
        }
      />
      <IndustryContextBar
        industryId={industryId}
        rightActions={<RegionToggle value={region} onChange={setRegion} />}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Sort Buttons */}
        <div data-tour="sort-buttons" className="mb-6 flex items-center gap-4">
          <span className="text-sm text-muted-foreground">정렬:</span>
          <div
            role="group"
            aria-label="정렬 기준"
            className="flex rounded-lg overflow-hidden border border-border-subtle"
          >
            {(
              [
                { key: 'percentChange', label: '변화율' },
                { key: 'marketCap', label: '시가총액' },
                { key: 'name', label: '이름' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => handleSortChange(item.key)}
                aria-pressed={sort === item.key}
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors flex items-center gap-1',
                  sort === item.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                )}
              >
                {item.label}
                {sort === item.key && (
                  <svg
                    className={cn('w-3 h-3', order === 'asc' && 'rotate-180')}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div data-tour="price-chart" className="mb-8 sk-card">
          <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-success" aria-hidden />
            상위 20개 기업 가격 변화율
          </h2>
          <PriceChangeChart
            data={data?.companies || []}
            isLoading={isLoading}
          />
        </div>

        {/* Price Trend Line Chart */}
        <div data-tour="price-trend" className="mb-8 sk-card">
          <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-chart-4" aria-hidden />
            상위 20개 기업 등락율 추이
          </h2>
          <CompanyTrendChart
            data={trendData?.items || []}
            isLoading={trendLoading || isLoading}
          />
        </div>

        {/* Empty state */}
        {!isLoading && data && data.companies.length === 0 && (
          <EmptyRegionState region={region} />
        )}

        {/* Table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-info" aria-hidden />
            전체 기업 목록 ({data?.total || 0}개)
          </h2>
          <PriceChangeTable
            data={data?.companies || []}
            onCompanyClick={setSelectedTicker}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Company Detail Dialog */}
      <Dialog
        open={!!selectedTicker}
        onOpenChange={(open) => !open && setSelectedTicker(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
