import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { getIndexableSectors, getSectorDetail } from '@/lib/sector-server'
import { DATA_SOURCE, UPDATE_CADENCE } from '@/lib/site-facts'
import { formatMarketCap, formatPrice, formatPriceChange } from '@/lib/format'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

/**
 * `/sectors/{id}` — 섹터 상세.
 *
 * 전부 서버 렌더링한다. 이 서비스의 다른 데이터 화면들은 `useRegion()`(→`useSearchParams()`)
 * 때문에 정적 프리렌더에서 CSR 로 빠지는데, 이 라우트는 클라이언트 상태가 필요 없어서
 * 지역 토글을 아예 두지 않았다. 덕분에 표가 그대로 초기 HTML 에 담긴다.
 */

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const list = await getIndexableSectors()
    return list.map((sector) => ({ sectorId: sector.id }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectorId: string }>
}): Promise<Metadata> {
  const { sectorId } = await params
  const sector = await getSectorDetail(sectorId)
  if (!sector) return { title: '섹터를 찾을 수 없음' }

  const top = sector.companies
    .slice(0, 3)
    .map((c) => c.nameKo || c.name)
    .join(', ')
  const title = `${sector.name} 섹터 대표 종목과 시가총액`
  const description = `${sector.name} 섹터에 속한 한국·미국 상장 종목 ${sector.companies.length}곳의 시가총액과 등락을 정리했습니다. 대표 종목: ${top}. ${UPDATE_CADENCE} 갱신.`

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/sectors/${sectorId}` },
    openGraph: {
      title: `${title} | Sector King`,
      description,
      url: `${BASE_URL}/sectors/${sectorId}`,
    },
    twitter: { card: 'summary_large_image', title: `${title} | Sector King`, description },
  }
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ sectorId: string }>
}) {
  const { sectorId } = await params
  const sector = await getSectorDetail(sectorId)
  if (!sector) notFound()

  const top3 = sector.companies
    .slice(0, 3)
    .map((c) => c.nameKo || c.name)
    .join(', ')
  const krCount = sector.companies.filter((c) => c.isKorean).length
  const usCount = sector.companies.length - krCount

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          ...(sector.primaryIndustry
            ? [{ name: sector.primaryIndustry.name, url: `${BASE_URL}/${sector.primaryIndustry.id}` }]
            : []),
          { name: '섹터', url: `${BASE_URL}/sectors` },
          { name: sector.name, url: `${BASE_URL}/sectors/${sector.id}` },
        ]}
      />
      {/* 화면 표에 실제로 보이는 종목만 넣는다 — 안 보이는 항목을 마크업에 넣으면 안 된다. */}
      <ItemListJsonLd
        name={`${sector.name} 섹터 종목 (시가총액 순)`}
        description={`${sector.name} 섹터에 속한 한국·미국 상장 종목을 시가총액 순으로 나열`}
        items={sector.companies.map((c) => ({
          name: c.nameKo || c.name,
          url: `${BASE_URL}/stock/${c.ticker}`,
        }))}
      />

      <GlobalTopBar subtitle={`${sector.name} 섹터`} />

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <nav className="mb-4 text-sm" aria-label="상위 페이지">
          <Link
            href="/sectors"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            전체 섹터
          </Link>
        </nav>

        <header className="max-w-3xl">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {sector.name} 섹터 — 대표 종목과 시가총액
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {sector.name} 섹터에는 섹터킹이 추적하는 종목 {sector.companies.length}곳
            {krCount > 0 && usCount > 0
              ? ` (한국 ${krCount} · 미국 ${usCount})`
              : krCount > 0
                ? ' (전부 한국 상장)'
                : ' (전부 미국 상장)'}
            이 속해 있고, 시가총액 합계는 {formatMarketCap(sector.marketCapUsd)} 입니다. 시가총액
            상위는 {top3} 순입니다.
            {sector.description ? ` ${sector.description}` : ''}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            데이터 기준일 {sector.date ?? '-'}
            {sector.baseDate ? ` (기간 비교 시작일 ${sector.baseDate})` : ''} · 갱신{' '}
            {UPDATE_CADENCE} · 출처 {DATA_SOURCE}
          </p>
        </header>

        <div className="sk-card mt-8 overflow-x-auto p-5">
          <table className="w-full min-w-[38rem] text-sm">
            <caption className="mb-3 text-left text-xs text-muted-foreground">
              {sector.name} 섹터 종목 — 시가총액 순 ({sector.date ?? '-'} 기준). 통화가 다른
              종목은 USD 로 환산했습니다.
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">종목</th>
                <th scope="col" className="py-2 pr-4 font-medium">티커</th>
                <th scope="col" className="py-2 pr-4 font-medium">상장</th>
                <th scope="col" className="py-2 pr-4 font-medium">시가총액</th>
                <th scope="col" className="py-2 pr-4 font-medium">현재가</th>
                <th scope="col" className="py-2 pr-4 font-medium">전일 대비</th>
              </tr>
            </thead>
            <tbody>
              {sector.companies.map((company) => (
                <tr key={company.ticker} className="border-b border-border-subtle last:border-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/stock/${company.ticker}`}
                      className="text-info hover:underline"
                    >
                      {company.nameKo || company.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {company.ticker}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {company.isKorean ? '한국' : '미국'}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {formatMarketCap(company.marketCapUsd)}
                  </td>
                  <td className="py-2 pr-4 text-foreground">{formatPrice(company.priceUsd)}</td>
                  <td className="py-2 pr-4 text-foreground">
                    {formatPriceChange(company.priceChangePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            섹터 시가총액 합계는 지금 시장이 이 영역 전체에 매긴 값이고, 기간 변화(
            {formatPriceChange(sector.changePct)})는 {sector.baseDate ?? '기간 시작일'} 이후 그
            값이 어느 방향으로 움직였는지입니다. 상위 한두 종목의 비중이 크면 섹터 지표가 사실상
            그 종목의 움직임을 따라갑니다.
          </p>
          <p>
            <strong className="text-foreground">이 수치가 의미하지 않는 것 — </strong>
            기간 변화는 시가총액 합계의 변화이지 외국인·기관 순매수나 거래대금이 아닙니다. 또한
            여기 목록은 섹터킹이 추적하는 종목만이며 해당 섹터의 모든 상장 기업이 아닙니다. 선정
            기준은 방법론 페이지에 있습니다.
          </p>
        </div>

        {sector.relatedSectors.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground">
              {sector.categoryName} 안의 다른 섹터
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {sector.relatedSectors.map((related) => (
                <li key={related.id}>
                  <Link href={`/sectors/${related.id}`} className="text-info hover:underline">
                    {related.name}
                  </Link>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {related.companyCount}종목
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav className="mt-8" aria-label="관련 페이지">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {sector.industries.map((industry) => (
              <li key={industry.id}>
                <Link href={`/${industry.id}`} className="text-info hover:underline">
                  {industry.name} 산업 지도
                </Link>
              </li>
            ))}
            <li>
              <Link href="/sectors" className="text-info hover:underline">
                전체 섹터 목록
              </Link>
            </li>
            <li>
              <Link
                href="/guide/market-cap-change-vs-net-buying"
                className="text-info hover:underline"
              >
                기간 변화가 순매수와 다른 이유
              </Link>
            </li>
            <li>
              <Link href="/rankings" className="text-info hover:underline">
                전 종목 점수 랭킹
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="text-info hover:underline">
                분류·산출 방법론
              </Link>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  )
}
