import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries, getIndustryFilter } from '@/lib/industry'
import { RankingsPage } from '@/components/rankings/rankings-page'
import { FaqJsonLd, BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { RANKINGS_FAQ } from '@/lib/seo-faq'
import { getRankings } from '@/app/api/rankings/route'

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
      <Suspense fallback={null}>
        <RankingsPage industryId={industryId} initialData={data} />
      </Suspense>
    </>
  )
}
