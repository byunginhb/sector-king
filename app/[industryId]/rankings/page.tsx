import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { RankingsPage } from '@/components/rankings/rankings-page'
import { FaqJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'
import { RANKINGS_FAQ } from '@/lib/seo-faq'

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
  return (
    <>
      <FaqJsonLd items={RANKINGS_FAQ} />
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
        <RankingsPage industryId={industryId} />
      </Suspense>
    </>
  )
}
