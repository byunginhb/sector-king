import Link from 'next/link'
import type { Metadata } from 'next'
import { SearchX, Home, TrendingUp, Info } from 'lucide-react'

export const metadata: Metadata = {
  title: '종목을 찾을 수 없습니다 | Sector King',
  robots: { index: false, follow: true },
}

/** 추적 중인 대표 종목 — 404 진입 시 탐색 진입점 제공. */
const POPULAR_TICKERS: readonly { ticker: string; label: string }[] = [
  { ticker: 'AAPL', label: 'Apple' },
  { ticker: 'NVDA', label: 'NVIDIA' },
  { ticker: 'MSFT', label: 'Microsoft' },
  { ticker: '005930.KS', label: '삼성전자' },
  { ticker: '000660.KS', label: 'SK하이닉스' },
]

export default function StockNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border-subtle bg-surface-1 mb-5"
        >
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </span>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          해당 종목을 찾을 수 없습니다
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          요청하신 종목이 존재하지 않거나 더 이상 추적하지 않는 종목입니다.
        </p>

        {/* 시장 한정으로 제거된 비US/KR 티커 옛 링크 안내 */}
        <div className="rounded-md border border-border-subtle bg-surface-1 p-4 text-left mb-6 flex gap-2.5">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sector King 은 현재 <span className="font-medium text-foreground">미국·한국 종목만</span>{' '}
            제공합니다. 일본·홍콩·대만·유럽 등 일부 종목은 더 이상 추적하지 않습니다.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" aria-hidden />
            홈으로 가서 종목 검색
          </Link>

          <div>
            <p className="eyebrow mb-2 flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              인기 종목
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {POPULAR_TICKERS.map((item) => (
                <Link
                  key={item.ticker}
                  href={`/stock/${item.ticker}`}
                  className="inline-flex items-center rounded-md border border-border-subtle bg-surface-1 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
