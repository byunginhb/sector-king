'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePriceChanges } from '@/hooks/use-price-changes'
import { formatPriceChange } from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'

interface PriceChangeCardProps {
  industryId?: string
}

export function PriceChangeCard({ industryId }: PriceChangeCardProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const { data, isLoading } = usePriceChanges({
    sort: 'percentChange',
    order: 'desc',
    industryId,
  })

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-card dark:border-border dark:shadow-none">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.companies.length === 0) {
    return null
  }

  const top10 = data.companies.slice(0, 10)
  const maxAbsChange = Math.max(
    ...top10.map((c) => Math.abs(c.percentChange ?? 0))
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-card dark:border-border dark:shadow-none">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-emerald-500 dark:text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        가격 변화율
      </h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
        {data.dateRange.start} ~ {data.dateRange.end}
      </p>
      <div className="space-y-2">
        {top10.map((company, index) => (
          <div
            key={company.ticker}
            onClick={() => setSelectedTicker(company.ticker)}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 w-5 text-right">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">
                {company.nameKo || company.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {company.ticker}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    (company.percentChange ?? 0) >= 0
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-red-500 dark:bg-red-400'
                  )}
                  style={{
                    width: `${(Math.abs(company.percentChange ?? 0) / maxAbsChange) * 100}%`,
                  }}
                />
              </div>
              <span
                className={cn(
                  'text-sm font-bold w-16 text-right',
                  getPriceChangeStyle(company.percentChange ?? 0)
                )}
              >
                {formatPriceChange(company.percentChange)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {data.total > 10 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-border">
          <Link
            href={industryId ? `/${industryId}/price-changes` : '/price-changes'}
            className="flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            전체 {data.total}개 회사 보기
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}

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
