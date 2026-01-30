'use client'

import type { PriceChangeItem } from '@/types'
import { formatMarketCap, formatPrice, formatPriceChange } from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

interface PriceChangeTableProps {
  data: PriceChangeItem[]
  onCompanyClick?: (ticker: string) => void
  isLoading?: boolean
}

export function PriceChangeTable({
  data,
  onCompanyClick,
  isLoading,
}: PriceChangeTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 dark:bg-slate-800" />
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-slate-900/50"
            />
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                회사
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                시작 가격
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                현재 가격
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                변화율
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                시가총액
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-card divide-y divide-gray-100 dark:divide-border">
            {data.map((company, index) => (
              <tr
                key={company.ticker}
                onClick={() => onCompanyClick?.(company.ticker)}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-400 dark:text-slate-500">
                  {index + 1}
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
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900 dark:text-slate-200">
                    {formatPrice(company.firstPrice)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {company.firstDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900 dark:text-slate-200">
                    {formatPrice(company.latestPrice)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {company.latestDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span
                    className={cn(
                      'text-sm font-bold',
                      getPriceChangeStyle(company.percentChange ?? 0)
                    )}
                  >
                    {formatPriceChange(company.percentChange)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-slate-200">
                  {formatMarketCap(company.marketCap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
