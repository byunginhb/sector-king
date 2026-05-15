'use client'

import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { usePriceChanges } from '@/hooks/use-price-changes'
import { formatPrice, formatPriceChange, formatDate, formatKrw } from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { CardError } from './card-error'
import { EmptyRegionState } from '@/components/ui/empty-region-state'
import type { PriceChangeItem, RegionFilter } from '@/types'

type PeriodType = 7 | 14 | 30 | null

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
  { value: null, label: '전체' },
]

interface PriceChangesCardProps {
  region?: RegionFilter
}

export function PriceChangesCard({ region = 'all' }: PriceChangesCardProps = {}) {
  const [period, setPeriod] = useState<PeriodType>(null)
  const { data, isLoading, error } = usePriceChanges({ sort: 'percentChange', order: 'desc', days: period, region })
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
      <div data-tour="price-changes-card" className="rounded-md border border-border-subtle bg-surface-1 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border-subtle bg-surface-2/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow eyebrow-accent mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-success shrink-0" aria-hidden />
                Price Changes
              </p>
              <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-tight">
                가격 변화율
              </h3>
              <p className="num-mono text-[10px] text-muted-foreground mt-1">
                {formatDate(data.dateRange.start)} → {formatDate(data.dateRange.end)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="기간 선택" className="flex rounded-lg overflow-hidden border border-border-subtle">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPeriod(opt.value)}
                    aria-pressed={period === opt.value}
                    className={cn(
                      'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition-colors tabular-nums',
                      period === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {gainers.length === 0 && losers.length === 0 && (
          <EmptyRegionState region={region} className="py-8" />
        )}

        {/* Content */}
        {(gainers.length > 0 || losers.length > 0) && (
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Gainers */}
          <div>
            <div className="px-4 py-2 bg-danger-bg/50 border-b border-border-subtle">
              <span className="text-xs font-semibold text-danger">
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
            <div className="px-4 py-2 bg-info/10 border-b border-border-subtle">
              <span className="text-xs font-semibold text-info">
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
        )}
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
      'divide-y divide-border-subtle',
      variant === 'gainer'
        ? 'bg-danger-bg/20'
        : 'bg-info/5'
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
              ? 'hover:bg-danger/10'
              : 'hover:bg-info/10'
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
    <div className="rounded-xl border border-border-subtle bg-card overflow-hidden">
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
