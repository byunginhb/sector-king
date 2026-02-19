import type { Metadata } from 'next'
import { IndustryDashboard } from '@/components/industry-dashboard'

export const metadata: Metadata = {
  title: 'Sector King - 산업별 투자 패권 지도 | 섹터 분석 대시보드',
  description:
    '산업별 섹터 시장 지배력 순위를 한눈에 파악하세요. 시가총액 분석, 섹터 자금 흐름, 가격 변화율 추적 - 반도체, AI, 클라우드, 헬스케어, 에너지 등 글로벌 산업 투자 데이터 대시보드.',
  keywords: [
    '주식 섹터 분석',
    'AI 주식',
    '섹터킹',
    '산업별 투자',
    '섹터 자금 흐름',
    '시가총액 순위',
    '주식 시장 분석',
    '패권 지도',
    '투자 대시보드',
    '반도체 주식',
    '기술주 분석',
    '헬스케어 주식',
    '에너지 섹터',
  ],
  openGraph: {
    title: 'Sector King - 산업별 투자 패권 지도',
    description:
      '산업별 섹터 시장 지배력 순위를 한눈에 파악하세요. 시가총액 분석, 섹터 자금 흐름, 가격 변화율 추적.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sector King - 산업별 투자 패권 지도',
    description:
      '산업별 섹터 시장 지배력 순위를 한눈에 파악하세요. 시가총액 분석, 섹터 자금 흐름, 가격 변화율 추적.',
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <IndustryDashboard />
    </main>
  )
}
