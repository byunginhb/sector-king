import { cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { StatisticsPage } from '@/components/statistics/statistics-page'

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
  return <StatisticsPage industryId={industryId} />
}
