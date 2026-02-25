import type { Metadata } from 'next'
import { IndustryMoneyFlowPageContent } from '@/components/industry-money-flow/industry-money-flow-page-content'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sectorking.co.kr'

const title = '산업별 자금 흐름'
const description = '모든 산업의 자금 유입/유출 현황을 한눈에 비교 - 시가총액 변화 기반 분석'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: `${title} | Sector King`,
    description,
    url: `${BASE_URL}/industry-money-flow`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Sector King`,
    description,
  },
  alternates: {
    canonical: `${BASE_URL}/industry-money-flow`,
  },
}

export default function IndustryMoneyFlowPage() {
  return <IndustryMoneyFlowPageContent />
}
