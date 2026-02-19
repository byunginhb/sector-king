import { cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { MoneyFlowPageContent } from '@/components/money-flow/money-flow-page-content'

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
    return { title: '섹터 자금 흐름' }
  }

  const title = `${industry.name} 섹터 자금 흐름`
  const description = `${industry.name} 산업 섹터별 자금 유입/유출 현황 - Money Flow Index, 시가총액 변화 분석`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url: `${BASE_URL}/${industryId}/money-flow`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sector King`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/${industryId}/money-flow`,
    },
  }
}

export default async function MoneyFlowPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  return <MoneyFlowPageContent industryId={industryId} />
}
