import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AnalystsPage } from '@/components/analysts/analysts-page'
import { BreadcrumbJsonLd } from '@/components/json-ld'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const title = '애널리스트 성적표 — 목표주가 예측력 검증'
const description =
  '증권사 애널리스트가 목표주가를 올렸는지 내렸는지, 그 방향대로 주가가 실제로 움직였는지로 예측력(방향 적중률)을 채점합니다. 한경 컨센서스 1년치 리포트 기반.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/analysts`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: { canonical: `${BASE_URL}/analysts` },
}

export default function AnalystsRoute() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '애널리스트 성적표', url: `${BASE_URL}/analysts` },
        ]}
      />
      <Suspense fallback={null}>
        <AnalystsPage />
      </Suspense>
    </>
  )
}
