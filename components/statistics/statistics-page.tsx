'use client'

import { useState } from 'react'
import { useCompanyStatistics, useTrends } from '@/hooks/use-statistics'
import { useRegion } from '@/hooks/use-region'
import { usePageTour } from '@/hooks/use-page-tour'
import { SectorTrendChart } from './sector-trend-chart'
import { CategoryComparisonChart } from './category-comparison-chart'
import { TopSectorsGrowthChart } from './top-sectors-growth-chart'
import { CompanyTrendChart } from './company-trend-chart'
import { CompanyRankingTable } from './company-ranking-table'
import { CompanyDetail } from '@/components/company-detail'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IndustryTitle } from '@/components/industry-title'
import { RegionToggle } from '@/components/region-toggle'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { IndustryContextBar } from '@/components/layout/industry-context-bar'
import { cn } from '@/lib/utils'
import { LineChart, BarChart3, TrendingUp, Building2, Trophy } from 'lucide-react'

type DaysFilter = '7' | '30' | 'all'

interface StatisticsPageProps {
  industryId: string
}

export function StatisticsPage({ industryId }: StatisticsPageProps) {
  const [days, setDays] = useState<DaysFilter>('30')
  const [sort, setSort] = useState<'count' | 'marketCap' | 'name'>('count')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const { region, setRegion } = useRegion()

  // Fetch data
  const { data: sectorTrends, isLoading: sectorLoading } = useTrends({
    type: 'sector',
    days,
    industryId,
    region,
  })

  const { data: categoryTrends, isLoading: categoryLoading } = useTrends({
    type: 'category',
    days,
    industryId,
    region,
  })

  const { data: companyTrends, isLoading: companyLoading } = useTrends({
    type: 'company',
    days,
    industryId,
    region,
  })

  const { data: companyStats, isLoading: statsLoading } = useCompanyStatistics({
    sort,
    order,
    page,
    limit: 20,
    industryId,
    region,
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
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        pageId="statistics"
        shareTitle="기업·섹터 트렌드 | Sector King"
        shareDescription="섹터별 기업 분포 및 시가총액 분석"
        subtitle={
          <span>
            <IndustryTitle industryId={industryId} /> 기업·섹터 트렌드
          </span>
        }
      />
      <IndustryContextBar
        industryId={industryId}
        rightActions={<RegionToggle value={region} onChange={setRegion} />}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div data-tour="days-filter" className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">기간:</span>
            <div
              role="group"
              aria-label="기간 선택"
              className="flex rounded-lg overflow-hidden border border-border-subtle"
            >
              {(['7', '30', 'all'] as DaysFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={cn(
                    'px-3 py-1.5 text-sm transition-colors',
                    days === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  )}
                >
                  {daysLabel[d]}
                </button>
              ))}
            </div>
          </div>
          {sectorTrends?.dateRange && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {sectorTrends.dateRange.start} ~ {sectorTrends.dateRange.end}
            </span>
          )}
        </div>

        {/* Charts Grid */}
        <div data-tour="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sector Trend Chart */}
          <div className="sk-card">
            <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-info" aria-hidden />
              섹터별 시가총액 추이
            </h2>
            <SectorTrendChart
              data={sectorTrends?.items || []}
              isLoading={sectorLoading}
            />
          </div>

          {/* Category Comparison Chart */}
          <div className="sk-card">
            <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-success" aria-hidden />
              카테고리별 시가총액
            </h2>
            <CategoryComparisonChart
              data={categoryTrends?.categories || []}
              isLoading={categoryLoading}
            />
          </div>

          {/* Top Sectors Growth Chart */}
          <div className="sk-card">
            <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" aria-hidden />
              섹터 성장률 Top/Bottom 5
            </h2>
            <TopSectorsGrowthChart
              data={sectorTrends?.sectorGrowth || []}
              isLoading={sectorLoading}
            />
          </div>

          {/* Company Trend Chart */}
          <div className="sk-card">
            <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-chart-4" aria-hidden />
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
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" aria-hidden />
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
