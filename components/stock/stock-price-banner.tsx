'use client'

import { ExternalLink, DollarSign, Flag } from 'lucide-react'
import { getRegionFromTicker } from '@/lib/region'
import {
  formatMarketCap,
  formatPrice,
  formatPriceChange,
  formatKrw,
} from '@/lib/format'
import { getPriceChangeStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse } from '@/types'

type Snapshot = CompanyDetailResponse['snapshot']
type History = CompanyDetailResponse['history']

/**
 * 외부 증권 사이트 링크.
 * 시장은 미국·한국으로 한정되므로 `.KS`(KRX) → 네이버, 그 외(미국) → Yahoo 2분기.
 */
export function getStockUrl(ticker: string): { url: string; label: string } {
  if (ticker.endsWith('.KS')) {
    const code = ticker.replace('.KS', '')
    return {
      url: `https://finance.naver.com/item/main.naver?code=${code}`,
      label: '네이버 증권에서 상세 차트 보기',
    }
  }
  return {
    url: `https://finance.yahoo.com/quote/${ticker}`,
    label: 'Yahoo Finance에서 상세 차트 보기',
  }
}

/** 티커의 region 을 한국/미국 텍스트 배지로 표시한다(색·아이콘만으로 구분하지 않음). */
export function RegionBadge({ ticker }: { ticker: string }) {
  const region = getRegionFromTicker(ticker)
  const isKr = region === 'KR'
  const Icon = isKr ? Flag : DollarSign
  const label = isKr ? '한국' : '미국'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-1 px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

interface StockPriceBannerProps {
  ticker: string
  snapshot: Snapshot
  history: History
}

/**
 * Last Price 배너 — 현재가, 추적 시작일 대비 누적 변동, 시가총액, 외부 링크.
 * 가격·시총은 API 에서 이미 toUsd 변환된 값을 받는다.
 */
export function StockPriceBanner({ ticker, snapshot, history }: StockPriceBannerProps) {
  if (!snapshot) return null

  const cumulativeChange = (() => {
    if (!history || history.length < 2 || snapshot.price == null) return null
    const firstPrice = history[0].price
    if (!firstPrice) return null
    const change = ((snapshot.price - firstPrice) / firstPrice) * 100
    return { change, startDate: history[0].date }
  })()

  const stockLink = getStockUrl(ticker)

  return (
    <div className="rounded-md border-l-2 border-l-primary border-y border-r border-y-border-subtle border-r-border-subtle bg-surface-1 p-4">
      <p className="eyebrow mb-2">Last Price</p>
      <div className="flex flex-wrap items-baseline gap-3">
        <div>
          <span className="num-mono text-3xl text-foreground">
            {formatPrice(snapshot.price ?? null)}
          </span>
          {snapshot.price != null && (
            <span className="text-sm text-muted-foreground ml-2">
              ({formatKrw(snapshot.price)})
            </span>
          )}
        </div>
        {cumulativeChange && (
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-lg font-semibold',
                getPriceChangeStyle(cumulativeChange.change)
              )}
            >
              {formatPriceChange(cumulativeChange.change)}
            </span>
            <span className="text-xs text-muted-foreground">(섹터킹 추적 시작일 대비)</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        시가총액: {formatMarketCap(snapshot.marketCap ?? null)}
        {snapshot.marketCap != null && ` (${formatKrw(snapshot.marketCap)})`}
      </p>
      <a
        href={stockLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-info hover:underline mt-2"
      >
        <ExternalLink className="w-4 h-4" aria-hidden />
        이 데이터 직접 확인 (새 창)
      </a>
    </div>
  )
}
