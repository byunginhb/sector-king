import { Suspense } from 'react'
import type { Metadata } from 'next'
import { IndustryDashboard } from '@/components/industry-dashboard'
import { SeoSummary } from '@/components/seo/seo-summary'
import { getIndustrySnapshot, getSnapshotDates } from '@/lib/seo-snapshot'
import { getSiteFacts } from '@/lib/site-facts'
import { formatMarketCap, formatPriceChange } from '@/lib/format'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
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

export default async function Home() {
  // 초기 HTML 용 스냅샷. IndustryDashboard 는 useSearchParams 를 쓰는 클라이언트 트리라
  // 정적 프리렌더에서 CSR 로 빠지고, 이 fallback 이 곧 크롤러가 읽는 본문이 된다.
  const [rows, dates, facts] = await Promise.all([
    getIndustrySnapshot(),
    getSnapshotDates(),
    getSiteFacts(),
  ])

  return (
    // 바깥을 div 로 둔다 — IndustryDashboard 와 SeoSummary 가 각자 <main> 을 렌더하므로
    // 여기서 또 <main> 을 쓰면 main 이 중첩된다.
    <div className="min-h-screen">
      <Suspense
        fallback={
          <SeoSummary
            h1="한국·미국 주식을 산업·섹터별로 정리한 시장 지배력 지도"
            answer={`섹터킹은 한국(코스피·코스닥)과 미국 상장 기업 ${facts.companyCount.toLocaleString('ko-KR')}곳을 ${facts.industryCount}개 산업 · ${facts.sectorCount.toLocaleString('ko-KR')}개 섹터로 분류해, 어느 섹터에 시가총액이 몰려 있고 최근 어디로 옮겨갔는지 보여주는 무료 대시보드입니다. 모든 시가총액은 통화가 다른 종목까지 USD 로 환산한 뒤 합산합니다. 종목 추천이 아니라 시장 구조를 읽는 도구입니다.`}
            interpretation="시가총액이 큰 섹터가 곧 좋은 섹터는 아닙니다. 규모는 현재 시장이 그 섹터에 매긴 값이고, 기간 변화율은 그 값이 최근 어느 방향으로 움직였는지를 나타냅니다."
            caveat="여기의 기간 변화율은 해당 섹터 구성 종목의 시가총액 합계 변화이며, 외국인·기관 순매수 같은 실제 매매 대금이 아닙니다. 주가가 오르면 한 주도 거래되지 않아도 시가총액은 늘어납니다."
            dataDate={dates.latest}
            baseDate={dates.base}
            table={{
              caption: `산업별 추적 종목 수와 시가총액 합계 (${dates.latest ?? '-'} 기준). 산업은 카테고리를 공유할 수 있어 합계는 내지 않습니다.`,
              head: ['산업', '섹터', '추적 종목', '시가총액(USD)', '기간 변화'],
              rows: rows.map((row) => ({
                href: `/${row.id}`,
                cells: [
                  row.name,
                  `${row.sectorCount}개`,
                  `${row.companyCount.toLocaleString('ko-KR')}개`,
                  formatMarketCap(row.marketCapUsd),
                  formatPriceChange(row.changePct),
                ],
              })),
            }}
            links={[
              { href: '/sectors', label: '전체 섹터 목록' },
              {
                href: '/guide/market-cap-change-vs-net-buying',
                label: '자금 흐름이 순매수와 다른 이유',
              },
              { href: '/rankings', label: '전 종목 점수 랭킹' },
              { href: '/market-size', label: '시장 규모 지도' },
              { href: '/indices', label: '세계 주요 지수' },
              { href: '/analysts', label: '애널리스트 성적표' },
              { href: '/news', label: '마켓 리포트' },
              { href: '/about', label: '섹터킹 소개' },
            ]}
          />
        }
      >
        <IndustryDashboard />
      </Suspense>
    </div>
  )
}
