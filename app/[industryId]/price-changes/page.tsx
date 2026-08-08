import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { PriceChangesPageContent } from '@/components/price-changes/price-changes-page-content'
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
    return { title: '가격 변화율' }
  }

  const title = `${industry.name} 가격 변화율`
  const description = `${industry.name} 산업 기업별 가격 변화율 분석 - 등락율 차트, 시가총액 변동 추적`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url: `${BASE_URL}/${industryId}/price-changes`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sector King`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/${industryId}/price-changes`,
    },
  }
}

export default async function PriceChangesPage({
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
          h1={`${name} 산업 종목 등락율`}
          answer={`${name} 산업에 속한 한국·미국 상장 종목들의 기간 등락율을 한 화면에서 비교합니다. 기준 기간을 바꿔가며 어떤 종목이 산업 평균을 앞섰고 뒤졌는지 확인할 수 있습니다.`}
          interpretation="등락율은 주가의 상대 변화라 시가총액 크기와 무관합니다. 작은 종목이 큰 폭으로 움직여도 산업 전체 시가총액에는 거의 영향이 없을 수 있습니다."
          caveat="등락율은 과거 주가 변화이며 앞으로의 수익률을 예측하지 않습니다. 배당·액면분할 등 주가 외 요인은 반영되지 않을 수 있습니다."
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
      <PriceChangesPageContent industryId={industryId} />
    </Suspense>
  )
}
