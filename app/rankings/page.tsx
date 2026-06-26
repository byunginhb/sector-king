import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RankingsPage } from '@/components/rankings/rankings-page'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

const title = '섹터킹 픽 — 전 종목 점수 랭킹'
const description =
  '전 산업 종목을 단기·장기 점수로 정렬한 섹터킹 픽 - 투자의견, 목표주가, 상승여력, 재무 지표를 한눈에'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/rankings`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: {
    canonical: `${BASE_URL}/rankings`,
  },
}

export default function GlobalRankingsRoute() {
  return (
    <Suspense fallback={null}>
      <RankingsPage />
    </Suspense>
  )
}
