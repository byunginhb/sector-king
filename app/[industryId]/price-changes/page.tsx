import { cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { PriceChangesPageContent } from '@/components/price-changes/price-changes-page-content'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'
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
  return <PriceChangesPageContent industryId={industryId} />
}
