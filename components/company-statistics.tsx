'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { SectorCompanyWithDetails } from '@/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'

interface CompanyCount {
  ticker: string
  name: string
  nameKo: string | null
  count: number
}

interface CompanyStatisticsProps {
  sectorCompanies: SectorCompanyWithDetails[]
  industryId?: string
}

export function CompanyStatistics({ sectorCompanies, industryId }: CompanyStatisticsProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const companyCounts = useMemo(() => {
    const countMap = new Map<string, CompanyCount>()

    for (const sc of sectorCompanies) {
      const existing = countMap.get(sc.company.ticker)
      if (existing) {
        countMap.set(sc.company.ticker, { ...existing, count: existing.count + 1 })
      } else {
        countMap.set(sc.company.ticker, {
          ticker: sc.company.ticker,
          name: sc.company.name,
          nameKo: sc.company.nameKo,
          count: 1,
        })
      }
    }

    return Array.from(countMap.values()).sort((a, b) => b.count - a.count)
  }, [sectorCompanies])

  const maxCount = companyCounts[0]?.count || 1

  if (companyCounts.length === 0) {
    return null
  }

  return (
    <div data-tour="company-stats" className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-card dark:border-border dark:shadow-none">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
        <svg
          aria-hidden="true"
          className="w-5 h-5 text-amber-500 dark:text-slate-400"
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
        회사 등장 통계
      </h3>
      <div className="space-y-3">
        {companyCounts.slice(0, 10).map((company, index) => (
          <button
            type="button"
            key={company.ticker}
            onClick={() => setSelectedTicker(company.ticker)}
            aria-label={`${company.nameKo || company.name} 상세 보기`}
            className="flex items-center gap-3 w-full text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
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
            <div className="flex items-center gap-3">
              <div className="w-16 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 dark:bg-linear-to-r dark:from-indigo-400 dark:to-purple-400 rounded-full transition-all duration-300"
                  style={{ width: `${(company.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-300 w-6 text-right">
                {company.count}
              </span>
            </div>
          </button>
        ))}
      </div>
      {companyCounts.length > 10 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-border">
          <Link
            href={industryId ? `/${industryId}/statistics` : '/statistics'}
            className="flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            전체 {companyCounts.length}개 회사 보기
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

      <Dialog open={!!selectedTicker} onOpenChange={(open) => !open && setSelectedTicker(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
