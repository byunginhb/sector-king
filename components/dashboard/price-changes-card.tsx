'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePriceChanges } from '@/hooks/use-price-changes'
import { formatPrice, formatPriceChange, formatDate, formatKrw } from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'
import type { PriceChangeItem } from '@/types'

type PeriodType = 7 | 14 | 30 | null

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
  { value: null, label: '전체' },
]

export function PriceChangesCard() {
  const [period, setPeriod] = useState<PeriodType>(null)
  const { data, isLoading, error } = usePriceChanges({ sort: 'percentChange', order: 'desc', days: period })
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const { gainers, losers } = useMemo(() => {
    if (!data) return { gainers: [], losers: [] }

    const validCompanies = data.companies.filter(
      (c) => c.percentChange !== null
    )

    return {
      gainers: validCompanies.slice(0, 10),
      losers: validCompanies.slice(-10).reverse(),
    }
  }, [data])

  if (isLoading) return <PriceChangesCardSkeleton />
  if (error || !data) return <CardError message="가격 변화율을 불러올 수 없습니다" />

  return (
    <>
      <div data-tour="price-changes-card" className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                가격 변화율
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(data.dateRange.start)} ~ {formatDate(data.dateRange.end)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-border">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors',
                      period === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-card text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Link
                href="/price-changes"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                전체 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Gainers */}
          <div>
            <div className="px-4 py-2 bg-red-50/50 dark:bg-red-950/20 border-b border-border">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                Top 10 상승
              </span>
            </div>
            <CompanyList
              companies={gainers}
              onCompanyClick={setSelectedTicker}
              variant="gainer"
            />
          </div>

          {/* Losers */}
          <div>
            <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/20 border-b border-border">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                Top 10 하락
              </span>
            </div>
            <CompanyList
              companies={losers}
              onCompanyClick={setSelectedTicker}
              variant="loser"
            />
          </div>
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

function CompanyList({
  companies,
  onCompanyClick,
  variant,
}: {
  companies: PriceChangeItem[]
  onCompanyClick: (ticker: string) => void
  variant: 'gainer' | 'loser'
}) {
  return (
    <div className={cn(
      'divide-y divide-border',
      variant === 'gainer'
        ? 'bg-red-50/30 dark:bg-red-950/10'
        : 'bg-blue-50/30 dark:bg-blue-950/10'
    )}>
      {companies.map((company) => (
        <div
          key={company.ticker}
          onClick={() => onCompanyClick(company.ticker)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onCompanyClick(company.ticker)
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            'px-4 py-2.5 transition-colors cursor-pointer',
            variant === 'gainer'
              ? 'hover:bg-red-100/50 dark:hover:bg-red-900/20'
              : 'hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="truncate max-w-[120px]">
              <div className="text-sm font-medium text-card-foreground truncate">
                {company.nameKo || company.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {company.ticker}
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div
                className={cn(
                  'text-sm font-bold',
                  getPriceChangeStyle(company.percentChange ?? null)
                )}
              >
                {formatPriceChange(company.percentChange)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPrice(company.latestPrice)}
                {company.latestPrice != null && (
                  <span className="ml-1">({formatKrw(company.latestPrice)})</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {companies.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          데이터 없음
        </div>
      )}
    </div>
  )
}

function PriceChangesCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-48 mt-2" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        {[0, 1].map((col) => (
          <div key={col}>
            <div className="px-4 py-2 border-b border-border">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-14 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
