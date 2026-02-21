'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCompanyStatistics, useTrends } from '@/hooks/use-statistics'
import { usePageTour } from '@/hooks/use-page-tour'
import { SectorTrendChart } from './sector-trend-chart'
import { CategoryComparisonChart } from './category-comparison-chart'
import { TopSectorsGrowthChart } from './top-sectors-growth-chart'
import { CompanyTrendChart } from './company-trend-chart'
import { CompanyRankingTable } from './company-ranking-table'
import { CompanyDetail } from '@/components/company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IndustryTitle } from '@/components/industry-title'
import { SearchTrigger } from '@/components/search-trigger'
import { HelpButton } from '@/components/onboarding/help-button'
import { cn } from '@/lib/utils'

type DaysFilter = '7' | '30' | 'all'

interface StatisticsPageProps {
  industryId?: string
}

export function StatisticsPage({ industryId }: StatisticsPageProps = {}) {
  const [days, setDays] = useState<DaysFilter>('30')
  const [sort, setSort] = useState<'count' | 'marketCap' | 'name'>('count')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  // Fetch data
  const { data: sectorTrends, isLoading: sectorLoading } = useTrends({
    type: 'sector',
    days,
    industryId,
  })

  const { data: categoryTrends, isLoading: categoryLoading } = useTrends({
    type: 'category',
    days,
    industryId,
  })

  const { data: companyTrends, isLoading: companyLoading } = useTrends({
    type: 'company',
    days,
    industryId,
  })

  const { data: companyStats, isLoading: statsLoading } = useCompanyStatistics({
    sort,
    order,
    page,
    limit: 20,
    industryId,
  })
  usePageTour('statistics')

  const handleSortChange = (newSort: 'count' | 'marketCap' | 'name') => {
    if (newSort === sort) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(newSort)
      setOrder('desc')
    }
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const daysLabel = {
    '7': '7일',
    '30': '30일',
    all: '전체',
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
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  {industryId && <IndustryTitle industryId={industryId} />} 회사 등장 통계
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  섹터별 기업 분포 및 시가총액 추이 분석
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SearchTrigger />
              <HelpButton pageId="statistics" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div data-tour="days-filter" className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">기간:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
              {(['7', '30', 'all'] as DaysFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'px-3 py-1.5 text-sm transition-colors',
                    days === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-card text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                >
                  {daysLabel[d]}
                </button>
              ))}
            </div>
          </div>
          {sectorTrends?.dateRange && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {sectorTrends.dateRange.start} ~ {sectorTrends.dateRange.end}
            </span>
          )}
        </div>

        {/* Charts Grid */}
        <div data-tour="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sector Trend Chart */}
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              섹터별 시가총액 추이
            </h2>
            <SectorTrendChart
              data={sectorTrends?.items || []}
              isLoading={sectorLoading}
            />
          </div>

          {/* Category Comparison Chart */}
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              카테고리별 시가총액
            </h2>
            <CategoryComparisonChart
              data={categoryTrends?.categories || []}
              isLoading={categoryLoading}
            />
          </div>

          {/* Top Sectors Growth Chart */}
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              섹터 성장률 Top/Bottom 5
            </h2>
            <TopSectorsGrowthChart
              data={sectorTrends?.sectorGrowth || []}
              isLoading={sectorLoading}
            />
          </div>

          {/* Company Trend Chart */}
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              주요 기업 시가총액 추이
            </h2>
            <CompanyTrendChart
              data={companyTrends?.items || []}
              isLoading={companyLoading}
            />
          </div>
        </div>

        {/* Company Ranking Table */}
        <div data-tour="ranking-table" className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            전체 회사 등장 랭킹
          </h2>
          <CompanyRankingTable
            companies={companyStats?.companies || []}
            total={companyStats?.total || 0}
            page={companyStats?.page || 1}
            totalPages={companyStats?.totalPages || 1}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
            onPageChange={handlePageChange}
            onCompanyClick={setSelectedTicker}
            isLoading={statsLoading}
          />
        </div>
      </main>

      <Dialog open={!!selectedTicker} onOpenChange={(open) => !open && setSelectedTicker(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
