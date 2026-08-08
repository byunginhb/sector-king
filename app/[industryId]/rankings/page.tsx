import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries, getIndustryFilter } from '@/lib/industry'
import { RankingsPage } from '@/components/rankings/rankings-page'
import { FaqJsonLd, BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { RANKINGS_FAQ } from '@/lib/seo-faq'
import { getRankings } from '@/app/api/rankings/route'
import { SeoSummary } from '@/components/seo/seo-summary'
import { formatRecommendation } from '@/lib/format'

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'
const getCachedIndustries = cache(() => getAllIndustries())

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industryId: string }>
}): Promise<Metadata> {
  const { industryId } = await params
  const industries = await getCachedIndustries()
  const industry = industries.find((i) => i.id === industryId)

  if (!industry) {
    return { title: '점수 랭킹' }
  }

  const title = `${industry.name} 점수 랭킹`
  const description = `${industry.name} 산업 종목을 단기·장기 점수로 정렬한 랭킹 - 투자의견, 목표주가, 상승여력, 재무 지표 한눈에`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url: `${BASE_URL}/${industryId}/rankings`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sector King`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/${industryId}/rankings`,
    },
  }
}

export default async function RankingsPageRoute({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  const industries = await getCachedIndustries()
  const industry = industries.find((i) => i.id === industryId)

  // SSR: 이 산업의 기본 랭킹을 서버에서 산출 → 표가 초기 HTML 에 담김 + ItemList 인용.
  const filter = await getIndustryFilter(industryId)
  const data = await getRankings({
    region: 'all',
    horizon: 'long',
    sortKey: 'long',
    sortDir: 'desc',
    limit: 100,
    industryTickers: filter?.tickers ?? [],
    appliedIndustryId: industryId,
  })

  return (
    <>
      <FaqJsonLd items={RANKINGS_FAQ} />
      <ItemListJsonLd
        name={`${industry?.name ?? '산업'} 점수 랭킹 — 장기 점수 상위 종목`}
        items={data.items.slice(0, 20).map((it) => ({
          name: it.nameKo ?? it.name ?? it.ticker,
          url: `${BASE_URL}/stock/${it.ticker}`,
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          ...(industry
            ? [{ name: industry.name, url: `${BASE_URL}/${industryId}` }]
            : []),
          { name: '점수 랭킹', url: `${BASE_URL}/${industryId}/rankings` },
        ]}
      />
      <Suspense
        fallback={
          <SeoSummary
            h1={`${industry?.name ?? '산업'} 종목 점수 랭킹`}
            answer={`${industry?.name ?? '이 산업'}에 속한 한국·미국 상장 종목 ${data.total.toLocaleString('ko-KR')}곳을 단기·장기 점수로 줄 세운 랭킹입니다. 점수는 규모·성장성·수익성·시장심리를 0~100 으로 환산해 가중 합산한 값이며 산출식은 전부 공개되어 있습니다.`}
            interpretation="같은 산업 안에서 비교해야 점수가 의미를 갖습니다. 산업이 다르면 재무 구조가 달라 점수 수준 자체가 다르게 형성됩니다."
            caveat="점수는 매수·매도 신호가 아니며 목표 수익률을 예측하지 않습니다."
            dataDate={data.date}
            table={{
              caption: `${industry?.name ?? '산업'} 장기 점수 상위 종목 (${data.date ?? '-'} 기준, 전체 ${data.total.toLocaleString('ko-KR')}종목 중)`,
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
              { href: `/${industryId}`, label: `${industry?.name ?? '산업'} 섹터 지도` },
              { href: '/rankings', label: '전 종목 랭킹' },
            ]}
          />
        }
      >
        <RankingsPage industryId={industryId} initialData={data} />
      </Suspense>
    </>
  )
}
