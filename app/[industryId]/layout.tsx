import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'

const getCachedIndustries = cache(() => getAllIndustries())

export async function generateStaticParams() {
  try {
    const industries = await getCachedIndustries()
    return industries.map((ind) => ({ industryId: ind.id }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industryId: string }>
}): Promise<Metadata> {
  const { industryId } = await params
  const industries = await getCachedIndustries()
  const industry = industries.find((i) => i.id === industryId)

  if (!industry) {
    return { title: 'Sector King' }
  }

  const title = `${industry.icon ?? ''} ${industry.name} 패권 지도`.trim()
  const description = `${industry.name} 산업 섹터별 시장 지배력 순위 시각화 - 시가총액 분석, 자금 흐름, 가격 변화율 추적`
  const url = `${BASE_URL}/${industryId}`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url,
      // TODO: OG 이미지 생성 후 활성화
      // images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${industry.name} 패권 지도` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Sector King`,
      description,
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function IndustryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  const industries = await getCachedIndustries()
  const validIds = industries.map((i) => i.id)

  if (!validIds.includes(industryId)) {
    notFound()
  }

  return <>{children}</>
}
