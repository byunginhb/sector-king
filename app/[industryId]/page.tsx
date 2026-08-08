import { Suspense } from 'react'
import Link from 'next/link'
import { HegemonyMap } from '@/components/hegemony-map'
import { SeoSummary } from '@/components/seo/seo-summary'
import { BreadcrumbJsonLd } from '@/components/json-ld'
import { getAllIndustries } from '@/lib/industry'
import { getSectorSnapshot, getSnapshotDates } from '@/lib/seo-snapshot'
import { formatMarketCap, formatPriceChange } from '@/lib/format'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/** 초기 HTML 표에 넣을 섹터 수 — 전부 넣으면 테크(50+ 섹터)에서 본문이 과하게 길어진다. */
const MAX_SECTOR_ROWS = 20

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params

  const [industries, sectorRows, dates] = await Promise.all([
    getAllIndustries(),
    getSectorSnapshot(industryId),
    getSnapshotDates(),
  ])
  const industry = industries.find((i) => i.id === industryId)
  const name = industry?.name ?? industryId
  const shown = sectorRows.slice(0, MAX_SECTOR_ROWS)
  const companyCount = sectorRows.reduce((sum, s) => sum + s.companyCount, 0)

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name, url: `${BASE_URL}/${industryId}` },
        ]}
      />
      <Suspense
        fallback={
          <SeoSummary
            h1={`${name} 산업 섹터별 시가총액 지도`}
            answer={`${name} 산업에 속한 ${sectorRows.length}개 섹터와 ${companyCount.toLocaleString('ko-KR')}개 종목(한국·미국 상장)의 시가총액 규모와 최근 기간 변화를 정리했습니다. 섹터는 시가총액 합계가 큰 순서이며, 통화가 다른 종목은 USD 로 환산한 뒤 합산합니다. 각 섹터의 대표 종목은 시가총액 상위 3곳입니다.`}
            interpretation={`섹터 규모는 시장이 지금 그 섹터에 매긴 값이고, 기간 변화는 그 값이 최근 어느 방향으로 움직였는지입니다. 같은 종목이 여러 섹터에 속할 수 있어 섹터 시가총액의 단순 합은 ${name} 산업의 실제 규모보다 큽니다.`}
            caveat="기간 변화는 시가총액 합계의 변화이지 실제 매수·매도 대금이 아닙니다. 종목이 섹터에 새로 편입되거나 빠져도 값이 움직입니다."
            dataDate={dates.latest}
            baseDate={dates.base}
            table={{
              caption: `${name} 산업 섹터별 시가총액 (${dates.latest ?? '-'} 기준, 상위 ${shown.length}개${sectorRows.length > shown.length ? ` / 전체 ${sectorRows.length}개` : ''})`,
              head: ['섹터', '종목 수', '시가총액(USD)', '기간 변화', '대표 종목'],
              rows: shown.map((sector) => ({
                cells: [
                  sector.name,
                  `${sector.companyCount}개`,
                  formatMarketCap(sector.marketCapUsd),
                  formatPriceChange(sector.changePct),
                  <span key="top" className="text-muted-foreground">
                    {sector.topCompanies.map((c, i) => (
                      <span key={c.ticker}>
                        {i > 0 ? ', ' : ''}
                        <Link href={`/stock/${c.ticker}`} className="text-info hover:underline">
                          {c.name}
                        </Link>
                      </span>
                    ))}
                  </span>,
                ],
              })),
            }}
            links={[
              { href: '/', label: '전체 산업 지도' },
              { href: `/${industryId}/money-flow`, label: `${name} 섹터 자금 흐름` },
              { href: `/${industryId}/price-changes`, label: `${name} 등락율` },
              { href: `/${industryId}/statistics`, label: `${name} 통계` },
              { href: `/${industryId}/rankings`, label: `${name} 종목 랭킹` },
            ]}
          />
        }
      >
        <HegemonyMap industryId={industryId} />
      </Suspense>
    </div>
  )
}
