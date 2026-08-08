import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MarketSizePage } from '@/components/market-size/market-size-page'
import { BreadcrumbJsonLd } from '@/components/json-ld'
import { SeoSummary } from '@/components/seo/seo-summary'
import { getSnapshotDates } from '@/lib/seo-snapshot'
import { getSiteFacts } from '@/lib/site-facts'

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

export default async function MarketSizeRoute() {
  const [dates, facts] = await Promise.all([getSnapshotDates(), getSiteFacts()])

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '시장 규모', url: `${BASE_URL}/market-size` },
        ]}
      />
      {/*
        표는 일부러 싣지 않는다 — 이 페이지의 트리맵은 다중 소속 종목의 시가총액을
        소속 섹터 수로 균등 배분한 값이라, 배분 전 수치를 여기에 적으면 화면과 어긋난다.
        (structured data·본문은 화면에 보이는 값과 일치해야 한다.)
      */}
      <Suspense
        fallback={
          <SeoSummary
            h1="산업·섹터별 시장 규모와 성장 전망"
            answer={`한국·미국 상장 기업 ${facts.companyCount.toLocaleString('ko-KR')}곳의 시가총액을 ${facts.industryCount}개 산업 · ${facts.sectorCount.toLocaleString('ko-KR')}개 섹터로 묶어, 어느 영역이 얼마나 큰지를 면적 지도로 보여줍니다. 여기에 애널리스트 컨센서스 기반의 매출 성장률과 목표주가 상승여력을 지표별 랭킹으로 함께 제공합니다. 모든 시가총액·매출은 USD 로 환산한 뒤 집계합니다.`}
            interpretation="면적은 지금 시장이 매긴 값의 크기이고, 성장 전망은 애널리스트들이 앞으로를 어떻게 보는지입니다. 큰 섹터가 반드시 빠르게 크는 섹터는 아니며 그 반대도 마찬가지입니다."
            caveat="시장 규모는 상장 기업의 시가총액 합계이지 그 산업의 매출 규모나 경제 기여도가 아닙니다. 또한 한 종목이 여러 섹터에 속하면 시가총액을 소속 섹터 수로 나눠 배분하므로, 지도의 섹터 값은 그 종목의 전체 시가총액이 아닙니다. 성장 전망은 애널리스트 예측이며 확정된 미래가 아닙니다."
            dataDate={dates.latest}
            links={[
              { href: '/', label: '전체 산업 지도' },
              { href: '/rankings', label: '전 종목 점수 랭킹' },
              { href: '/indices', label: '세계 주요 지수' },
              { href: '/analysts', label: '애널리스트 성적표' },
            ]}
          />
        }
      >
        <MarketSizePage />
      </Suspense>
    </>
  )
}
