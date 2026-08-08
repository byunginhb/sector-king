import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { StatisticsPage } from '@/components/statistics/statistics-page'
import { SeoSummary } from '@/components/seo/seo-summary'
import { getSnapshotDates } from '@/lib/seo-snapshot'

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
    return { title: '회사 등장 통계' }
  }

  const title = `${industry.name} 회사 등장 통계`
  const description = `${industry.name} 산업 섹터별 기업 분포 및 시가총액 추이 분석 - 기업 등장 랭킹, 성장률 비교`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url: `${BASE_URL}/${industryId}/statistics`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sector King`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/${industryId}/statistics`,
    },
  }
}

export default async function StatisticsPageRoute({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  const [industries, dates] = await Promise.all([getCachedIndustries(), getSnapshotDates()])
  const name = industries.find((i) => i.id === industryId)?.name ?? industryId

  return (
    <Suspense
      fallback={
        <SeoSummary
          h1={`${name} 산업 통계 — 시가총액 분포와 추이`}
          answer={`${name} 산업의 시가총액 상위 종목, 섹터별 비중, 기간별 추이를 통계로 정리했습니다. 통화가 다른 종목은 USD 로 환산한 뒤 집계하며, 기준일은 최신 거래일입니다.`}
          interpretation="상위 소수 종목이 산업 시가총액의 큰 몫을 차지하는지(집중), 아니면 고르게 퍼져 있는지(분산)를 먼저 보세요. 집중된 산업은 대표 종목 한둘의 움직임이 산업 전체 지표를 좌우합니다."
          caveat="여기 수치는 섹터킹이 추적하는 종목만 집계한 값이며, 해당 산업의 모든 상장 기업을 포함하지 않습니다. 선정 기준은 방법론 페이지에 있습니다."
          dataDate={dates.latest}
          links={[
            { href: '/', label: '전체 산업 지도' },
            { href: `/${industryId}`, label: `${name} 섹터 지도` },
            { href: `/${industryId}/money-flow`, label: `${name} 섹터 자금 흐름` },
            { href: `/${industryId}/rankings`, label: `${name} 종목 랭킹` },
          ]}
        />
      }
    >
      <StatisticsPage industryId={industryId} />
    </Suspense>
  )
}
