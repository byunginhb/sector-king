'use client'

import { useState } from 'react'
import type { CompanyStatItem } from '@/types'
import { formatMarketCap, formatPriceChange } from '@/lib/format'
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
        'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors',
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
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 dark:bg-slate-800" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-slate-900/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider w-12">
                #
              </th>
              <SortHeader column="name" label="회사" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                등장 섹터
              </th>
              <SortHeader column="count" label="횟수" className="text-center" />
              <SortHeader column="marketCap" label="시가총액" className="text-right" />
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                등락
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-card divide-y divide-gray-100 dark:divide-border">
            {companies.map((company, index) => (
              <tr
                key={company.ticker}
                onClick={() => onCompanyClick?.(company.ticker)}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-400 dark:text-slate-500">
                  {(page - 1) * 20 + index + 1}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-200">
                      {company.nameKo || company.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {company.ticker}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {company.sectors.slice(0, 3).map((sector) => (
                      <span
                        key={sector.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {sector.name}
                        {sector.rank === 1 && (
                          <svg className="ml-1 w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </span>
                    ))}
                    {company.sectors.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                        +{company.sectors.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-200">
                    {company.count}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-slate-200">
                  {formatMarketCap(company.latestSnapshot?.marketCap ?? null)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  {company.latestSnapshot?.priceChange !== null &&
                  company.latestSnapshot?.priceChange !== undefined ? (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        company.latestSnapshot.priceChange >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {formatPriceChange(company.latestSnapshot.priceChange)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-slate-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-border flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-slate-400">
          총 {total}개 회사 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              page <= 1
                ? 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
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
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
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
                ? 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            )}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
