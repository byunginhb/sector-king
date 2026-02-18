'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePriceChanges } from '@/hooks/use-price-changes'
import { useTrends } from '@/hooks/use-statistics'
import { PriceChangeChart } from '@/components/price-changes/price-change-chart'
import { PriceChangeTable } from '@/components/price-changes/price-change-table'
import { CompanyTrendChart } from '@/components/statistics/company-trend-chart'
import { CompanyDetail } from '@/components/company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type SortType = 'percentChange' | 'name' | 'marketCap'

interface PriceChangesPageContentProps {
  industryId?: string
}

export function PriceChangesPageContent({ industryId }: PriceChangesPageContentProps) {
  const [sort, setSort] = useState<SortType>('percentChange')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const { data, isLoading } = usePriceChanges({ sort, order, industryId })

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
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={industryId ? `/${industryId}` : '/'}
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  가격 변화율
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {data?.dateRange
                    ? `${data.dateRange.start} ~ ${data.dateRange.end} 기간 동안의 가격 변화`
                    : '섹터킹 추적 시작일 대비 가격 변화'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sort Buttons */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            정렬:
          </span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
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
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors flex items-center gap-1',
                  sort === item.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-card text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
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
        <div className="mb-8 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            상위 20개 기업 가격 변화율
          </h2>
          <PriceChangeChart
            data={data?.companies || []}
            isLoading={isLoading}
          />
        </div>

        {/* Price Trend Line Chart */}
        <div className="mb-8 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            상위 20개 기업 등락율 추이
          </h2>
          <CompanyTrendChart
            data={trendData?.items || []}
            isLoading={trendLoading || isLoading}
          />
        </div>

        {/* Table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
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
