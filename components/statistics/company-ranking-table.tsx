'use client'

import type { CompanyStatItem } from '@/types'
import { formatPriceChange } from '@/lib/format'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { cn } from '@/lib/utils'

interface CompanyRankingTableProps {
  companies: CompanyStatItem[]
  total: number
  page: number
  totalPages: number
  sort: 'count' | 'marketCap' | 'name'
  order: 'asc' | 'desc'
  onSortChange: (sort: 'count' | 'marketCap' | 'name') => void
  onPageChange: (page: number) => void
  onCompanyClick?: (ticker: string) => void
  isLoading?: boolean
}

export function CompanyRankingTable({
  companies,
  total,
  page,
  totalPages,
  sort,
  order,
  onSortChange,
  onPageChange,
  onCompanyClick,
  isLoading,
}: CompanyRankingTableProps) {
  const fmt = useCurrencyFormat()
  const handleSort = (newSort: 'count' | 'marketCap' | 'name') => {
    onSortChange(newSort)
  }

  const SortHeader = ({
    column,
    label,
    className,
  }: {
    column: 'count' | 'marketCap' | 'name'
    label: string
    className?: string
  }) => (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-surface-2 transition-colors',
        className
      )}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sort === column && (
          <svg
            className={cn('w-4 h-4', order === 'desc' ? 'rotate-180' : '')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  )

  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-md overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-surface-2" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 border-t border-border-subtle bg-surface-2/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-surface-2/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                #
              </th>
              <SortHeader column="name" label="회사" />
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                등장 섹터
              </th>
              <SortHeader column="count" label="횟수" className="text-center" />
              <SortHeader column="marketCap" label="시가총액" className="text-right" />
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                등락
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-1 divide-y divide-border-subtle">
            {companies.map((company, index) => (
              <tr
                key={company.ticker}
                onClick={() => onCompanyClick?.(company.ticker)}
                className="hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                  {(page - 1) * 20 + index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {company.nameKo || company.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.ticker}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {company.sectors.slice(0, 3).map((sector) => (
                      <span
                        key={sector.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info"
                      >
                        {sector.name}
                        {sector.rank === 1 && (
                          <svg className="ml-1 w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </span>
                    ))}
                    {company.sectors.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-2 text-muted-foreground">
                        +{company.sectors.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-bold text-foreground">
                    {company.count}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-foreground">
                  {fmt.marketCap(company.latestSnapshot?.marketCap ?? null)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  {company.latestSnapshot?.priceChange !== null &&
                  company.latestSnapshot?.priceChange !== undefined ? (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        company.latestSnapshot.priceChange >= 0
                          ? 'text-success'
                          : 'text-danger'
                      )}
                    >
                      {formatPriceChange(company.latestSnapshot.priceChange)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 bg-surface-2/50 border-t border-border-subtle flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          총 {total}개 회사 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              page <= 1
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-foreground hover:bg-surface-3'
            )}
          >
            이전
          </button>
          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'w-8 h-8 text-sm rounded-md transition-colors',
                    pageNum === page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-surface-3'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              page >= totalPages
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-foreground hover:bg-surface-3'
            )}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
