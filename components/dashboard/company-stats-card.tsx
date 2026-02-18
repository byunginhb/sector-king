'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCompanyStatistics } from '@/hooks/use-statistics'
import { formatMarketCap, formatPriceChange } from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'

export function CompanyStatsCard() {
  const { data, isLoading, error } = useCompanyStatistics({ limit: 10 })
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  if (isLoading) return <CompanyStatsCardSkeleton />
  if (error || !data) return <CardError message="회사 통계를 불러올 수 없습니다" />

  const { companies } = data

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              회사 등장 통계 Top 10
            </h3>
            <Link
              href="/statistics"
              className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              전체 보기 →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            가장 많은 섹터에 등장하는 회사
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 text-left w-8">#</th>
                <th className="px-4 py-2.5 text-left">회사</th>
                <th className="px-4 py-2.5 text-center">섹터수</th>
                <th className="px-4 py-2.5 text-right">시가총액</th>
                <th className="px-4 py-2.5 text-right">등락</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((company, index) => (
                <tr
                  key={company.ticker}
                  onClick={() => setSelectedTicker(company.ticker)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedTicker(company.ticker)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-sm text-muted-foreground font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-card-foreground truncate max-w-[140px]">
                      {company.nameKo || company.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.ticker}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-sm font-bold text-card-foreground">
                      {company.count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-card-foreground">
                    {formatMarketCap(company.latestSnapshot?.marketCap ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        'text-sm',
                        getPriceChangeStyle(company.latestSnapshot?.priceChange ?? null)
                      )}
                    >
                      {formatPriceChange(company.latestSnapshot?.priceChange ?? null)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Detail Dialog */}
      <Dialog
        open={!!selectedTicker}
        onOpenChange={(open) => !open && setSelectedTicker(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function CompanyStatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-36 mt-2" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8 ml-auto" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
