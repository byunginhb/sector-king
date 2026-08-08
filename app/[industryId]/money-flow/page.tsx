import { Suspense, cache } from 'react'
import type { Metadata } from 'next'
import { getAllIndustries } from '@/lib/industry'
import { MoneyFlowPageContent } from '@/components/money-flow/money-flow-page-content'
import { SeoSummary } from '@/components/seo/seo-summary'
import { getSectorSnapshot, getSnapshotDates } from '@/lib/seo-snapshot'
import { MIN_COMPANIES_FOR_PAGE } from '@/lib/sector-server'
import { formatMarketCap, formatPriceChange } from '@/lib/format'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'
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
  const [industries, sectorRows, dates] = await Promise.all([
    getCachedIndustries(),
    getSectorSnapshot(industryId),
    getSnapshotDates(),
  ])
  const name = industries.find((i) => i.id === industryId)?.name ?? industryId
  const shown = sectorRows
    .filter((s) => s.changePct !== null)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
    .slice(0, 15)

  return (
    <Suspense
      fallback={
        <SeoSummary
          h1={`${name} 산업 섹터 자금 흐름 — 시가총액이 어디로 옮겨갔나`}
          answer={`${dates.base ?? '기간 시작일'}부터 ${dates.latest ?? '최신 거래일'}까지 ${name} 산업 ${sectorRows.length}개 섹터의 시가총액 합계가 얼마나 늘거나 줄었는지를 정리했습니다. 값이 큰 섹터일수록 그 기간 시장이 매긴 값이 많이 늘어난 곳입니다. 통화가 다른 종목은 USD 로 환산한 뒤 합산합니다.`}
          interpretation="여러 섹터가 같은 방향으로 크게 움직이면 개별 종목 이슈보다 산업 전반의 재평가일 가능성이 큽니다. 반대로 한 섹터만 튀면 그 섹터의 대표 종목을 먼저 확인하세요."
          caveat="이 값은 섹터 구성 종목의 시가총액 합계 변화이지, 외국인·기관 순매수나 거래대금이 아닙니다. 실제로 돈이 들어온 규모가 아니라 시장이 매긴 값의 변화이며, 한 주도 거래되지 않아도 주가가 오르면 늘어납니다."
          dataDate={dates.latest}
          baseDate={dates.base}
          table={{
            caption: `${name} 산업 섹터별 시가총액 변화 (${dates.base ?? '-'} → ${dates.latest ?? '-'}, 상승률 상위 ${shown.length}개)`,
            head: ['섹터', '종목 수', '시가총액(USD)', '기간 변화', '대표 종목'],
            rows: shown.map((sector) => ({
              // 종목 3개 미만 섹터는 상세 페이지가 없다(404 링크 방지).
              href:
                sector.companyCount >= MIN_COMPANIES_FOR_PAGE
                  ? `/sectors/${sector.id}`
                  : undefined,
              cells: [
                sector.name,
                `${sector.companyCount}개`,
                formatMarketCap(sector.marketCapUsd),
                formatPriceChange(sector.changePct),
                sector.topCompanies.map((c) => c.name).join(', '),
              ],
            })),
          }}
          links={[
            {
              href: '/guide/market-cap-change-vs-net-buying',
              label: '이 값이 순매수와 다른 이유',
            },
            { href: '/guide/how-to-read-money-flow', label: '자금 흐름 읽는 법' },
            { href: '/', label: '전체 산업 지도' },
            { href: `/${industryId}`, label: `${name} 섹터 지도` },
            { href: `/${industryId}/price-changes`, label: `${name} 등락율` },
            { href: `/${industryId}/statistics`, label: `${name} 통계` },
          ]}
        />
      }
    >
      <MoneyFlowPageContent industryId={industryId} />
    </Suspense>
  )
}
