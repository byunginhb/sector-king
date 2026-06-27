import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RankingsPage } from '@/components/rankings/rankings-page'
import { FaqJsonLd, BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { RANKINGS_FAQ } from '@/lib/seo-faq'
import { getRankings } from '@/app/api/rankings/route'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/** 기본 뷰(전체 지역·장기 점수 desc) — RankingsPage 클라 기본값과 일치해야 initialData 가 적용된다. */
const DEFAULT_QUERY = {
  region: 'all' as const,
  horizon: 'long' as const,
  sortKey: 'long' as const,
  sortDir: 'desc' as const,
  limit: 100,
}

const title = '섹터킹 픽 — 전 종목 점수 랭킹'
const description =
  '전 산업 종목을 단기·장기 점수로 정렬한 섹터킹 픽 - 투자의견, 목표주가, 상승여력, 재무 지표를 한눈에'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/rankings`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: {
    canonical: `${BASE_URL}/rankings`,
  },
}

export default async function GlobalRankingsRoute() {
  // SSR: 전 종목 기본 랭킹을 서버에서 산출 → 표가 초기 HTML 에 담기고 ItemList 로 인용 가능.
  const data = await getRankings({ ...DEFAULT_QUERY, industryTickers: null, appliedIndustryId: null })

  return (
    <>
      <FaqJsonLd items={RANKINGS_FAQ} />
      <ItemListJsonLd
        name="섹터킹 픽 — 장기 점수 상위 종목"
        description="단기·장기 점수로 줄 세운 무료 종목 랭킹의 상위 종목"
        items={data.items.slice(0, 20).map((it) => ({
          name: it.nameKo ?? it.name ?? it.ticker,
          url: `${BASE_URL}/stock/${it.ticker}`,
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '섹터킹 픽', url: `${BASE_URL}/rankings` },
        ]}
      />
      <Suspense fallback={null}>
        <RankingsPage initialData={data} />
      </Suspense>
    </>
  )
}
