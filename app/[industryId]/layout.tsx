import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'

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

  return {
    title: `Sector King - ${industry.name} 패권 지도`,
    description: `${industry.name} 산업 섹터별 시장 지배력 순위 시각화`,
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
