import { cache, Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStockFacts, isValidTicker } from '@/lib/stock-server'
import { StockDetailPage } from '@/components/stock/stock-detail-page'
import { StockDetailSkeleton } from '@/components/stock/stock-detail-sections'
import { StockJsonLd } from '@/components/json-ld'
import { StockSeoFacts } from '@/components/seo/stock-seo-facts'
import { buildStockDescription } from '@/lib/stock-meta'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const revalidate = 3600 // 1시간 캐시 (company API와 동일)

const getCachedSummary = cache((ticker: string) => getStockFacts(ticker))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>
}): Promise<Metadata> {
  const { ticker } = await params

  if (!isValidTicker(ticker)) {
    return { title: '종목 없음' }
  }

  const summary = await getCachedSummary(ticker)
  if (!summary) {
    return { title: '종목 없음' }
  }

  const displayName = summary.nameKo || summary.name
  // 브랜드는 루트 layout 의 template('%s | Sector King')이 붙인다 — 여기서 또 붙이면 두 번 나온다.
  // Search Console 실측: 종목 페이지 노출의 대부분이 "{종목} 주가"·"{종목} 시총" 검색어인데
  // 제목에 "주가"가 없었다(순위 9~12위, CTR 0%대). 검색어를 제목에, 실제 수치를 설명에 싣는다.
  const title = `${displayName}(${summary.ticker}) 주가·시가총액·섹터 순위`
  const description = buildStockDescription(displayName, summary)
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
        >
          {/* 데이터 도착 전 본문 = 초기 HTML. 크롤러는 이걸 읽는다. */}
          <StockSeoFacts facts={summary} />
        </StockDetailPage>
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
