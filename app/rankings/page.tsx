import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RankingsPage } from '@/components/rankings/rankings-page'
import { FaqJsonLd, BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { RANKINGS_FAQ } from '@/lib/seo-faq'
import { getRankings } from '@/app/api/rankings/route'
import { SeoSummary } from '@/components/seo/seo-summary'
import { formatRecommendation } from '@/lib/format'

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
      {/*
        fallback 이 곧 초기 HTML 이다 — RankingsPage 는 useSearchParams 를 쓰는 클라이언트
        트리라 정적 프리렌더에서 CSR 로 빠지고, initialData 를 넘겨도 서버 HTML 에는 남지 않는다.
        같은 data 로 표를 한 번 더 서버 렌더링해 JS 없이도 상위 종목이 읽히게 한다.
      */}
      <Suspense
        fallback={
          <SeoSummary
            h1="한국·미국 전 종목 점수 랭킹 (섹터킹 픽)"
            answer={`섹터킹이 추적하는 한국·미국 상장 종목 ${data.total.toLocaleString('ko-KR')}곳을 단기·장기 점수로 줄 세운 무료 랭킹입니다. 점수는 규모·성장성·수익성·시장심리 지표를 0~100 으로 환산해 가중 합산한 값이며, 산출식은 방법론 페이지에 전부 공개되어 있습니다. 아래 표는 장기 점수 상위 ${Math.min(20, data.items.length)}종목입니다.`}
            interpretation="장기 점수는 재무 체력과 규모에, 단기 점수는 최근 추세와 시장심리에 더 무게를 둡니다. 두 점수가 갈리는 종목은 그 이유를 종목 상세에서 확인하세요."
            caveat="점수는 매수·매도 신호가 아니며 목표 수익률을 예측하지 않습니다. 공개된 재무·주가 데이터를 같은 기준으로 환산해 비교 가능하게 만든 값일 뿐입니다."
            dataDate={data.date}
            table={{
              caption: `장기 점수 상위 종목 (${data.date ?? '-'} 기준, 전체 ${data.total.toLocaleString('ko-KR')}종목 중)`,
              head: ['종목', '티커', '장기 점수', '단기 점수', '투자의견'],
              rows: data.items.slice(0, 20).map((item) => ({
                href: `/stock/${item.ticker}`,
                cells: [
                  item.nameKo ?? item.name ?? item.ticker,
                  item.ticker,
                  item.longScore != null ? item.longScore.toFixed(1) : '-',
                  item.shortScore != null ? item.shortScore.toFixed(1) : '-',
                  formatRecommendation(item.recommendationKey),
                ],
              })),
            }}
            links={[
              { href: '/', label: '전체 산업 지도' },
              { href: '/market-size', label: '시장 규모 지도' },
              { href: '/analysts', label: '애널리스트 성적표' },
            ]}
          />
        }
      >
        <RankingsPage initialData={data} />
      </Suspense>
    </>
  )
}
