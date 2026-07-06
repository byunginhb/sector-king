import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MarketSizePage } from '@/components/market-size/market-size-page'
import { BreadcrumbJsonLd } from '@/components/json-ld'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const title = '시장 규모 — 섹터·카테고리별 시총·성장 전망'
const description =
  '카테고리·섹터별 시가총액과 애널리스트 성장 전망(매출 성장률·목표주가 상승여력)을 버블·트리맵으로 시각화. 모든 시총·매출은 USD 정규화 후 집계.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/market-size`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: {
    canonical: `${BASE_URL}/market-size`,
  },
}

export default function MarketSizeRoute() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '시장 규모', url: `${BASE_URL}/market-size` },
        ]}
      />
      <Suspense fallback={null}>
        <MarketSizePage />
      </Suspense>
    </>
  )
}
