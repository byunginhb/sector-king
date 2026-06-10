import { cache, Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStockSummary, isValidTicker } from '@/lib/stock-server'
import { StockDetailPage } from '@/components/stock/stock-detail-page'
import { StockDetailSkeleton } from '@/components/stock/stock-detail-sections'
import { StockJsonLd } from '@/components/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const revalidate = 3600 // 1시간 캐시 (company API와 동일)

const getCachedSummary = cache((ticker: string) => getStockSummary(ticker))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>
}): Promise<Metadata> {
  const { ticker } = await params

  if (!isValidTicker(ticker)) {
    return { title: '종목 없음 | Sector King' }
  }

  const summary = await getCachedSummary(ticker)
  if (!summary) {
    return { title: '종목 없음 | Sector King' }
  }

  const displayName = summary.nameKo || summary.name
  const title = `${displayName}(${summary.ticker}) 시가총액·패권 점수 | Sector King`
  const description = `${displayName}의 실시간 시가총액, 섹터 지배력 순위, 성장성·수익성 패권 점수 분석`
  const url = `${BASE_URL}/stock/${summary.ticker}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params

  if (!isValidTicker(ticker)) {
    notFound()
  }

  const summary = await getCachedSummary(ticker)
  if (!summary) {
    notFound()
  }

  return (
    <>
      <StockJsonLd
        ticker={summary.ticker}
        name={summary.name}
        nameKo={summary.nameKo}
        marketCapUsd={summary.marketCapUsd}
      />
      <Suspense fallback={<StockDetailFallback />}>
        <StockDetailPage
          ticker={summary.ticker}
          initialName={summary.name}
          initialNameKo={summary.nameKo}
        />
      </Suspense>
    </>
  )
}

function StockDetailFallback() {
  return (
    <div className="container mx-auto px-4 py-6">
      <StockDetailSkeleton showChart />
    </div>
  )
}
