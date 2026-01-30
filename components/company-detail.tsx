'use client'

import { useCompany } from '@/hooks/use-company'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMarketCap, formatPrice, formatPriceChange } from '@/lib/format'
import { getPriceChangeStyle, getRankStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

function getStockUrl(ticker: string): { url: string; label: string } {
  // Korean stocks (KRX): 005930.KS → Naver Finance
  if (ticker.endsWith('.KS')) {
    const code = ticker.replace('.KS', '')
    return {
      url: `https://finance.naver.com/item/main.naver?code=${code}`,
      label: '네이버 증권에서 상세 차트 보기',
    }
  }
  // Other stocks → Yahoo Finance
  return {
    url: `https://finance.yahoo.com/quote/${ticker}`,
    label: 'Yahoo Finance에서 상세 차트 보기',
  }
}

interface CompanyDetailProps {
  ticker: string
}

export function CompanyDetail({ ticker }: CompanyDetailProps) {
  const { data, isLoading, error } = useCompany(ticker)

  if (isLoading) {
    return <CompanyDetailSkeleton />
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <p className="text-muted-foreground">Failed to load company data</p>
      </div>
    )
  }

  const { company, snapshot, sectors, history } = data

  // Calculate cumulative change from first recorded date
  const cumulativeChange = (() => {
    if (!history || history.length < 2 || !snapshot?.price) return null
    const firstPrice = history[0].price
    if (!firstPrice) return null
    const change = ((snapshot.price - firstPrice) / firstPrice) * 100
    return {
      change,
      startDate: history[0].date,
    }
  })()

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {company.nameKo || company.name}
          <span className="text-muted-foreground text-base font-normal ml-2">({company.ticker})</span>
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">{company.name}</DialogDescription>
      </DialogHeader>

      {/* Current Price Banner */}
      {snapshot && (
        <div className="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(snapshot.price ?? null)}
            </span>
            {cumulativeChange && (
              <div className="flex items-baseline gap-1">
                <span className={cn('text-lg font-semibold', getPriceChangeStyle(cumulativeChange.change))}>
                  {formatPriceChange(cumulativeChange.change)}
                </span>
                <span className="text-xs text-muted-foreground">
                  (섹터킹 추적 시작일 대비)
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            시가총액: {formatMarketCap(snapshot.marketCap ?? null)}
          </p>
          {/* Stock Link */}
          {(() => {
            const stockLink = getStockUrl(company.ticker)
            return (
              <a
                href={stockLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {stockLink.label}
              </a>
            )
          })()}
        </div>
      )}

      {/* Hegemony Areas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          패권 영역
        </h3>
        <div className="flex flex-wrap gap-2">
          {sectors.map(({ sector, rank }) => {
            const style = getRankStyle(rank)
            return (
              <Badge
                key={sector.id}
                className={cn('border font-medium', style.badge)}
              >
                {rank === 1 && <span className="text-amber-500 mr-1">★</span>}
                {sector.name}: {style.label}
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CompanyDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  )
}
