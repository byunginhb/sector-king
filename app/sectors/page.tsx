import type { Metadata } from 'next'
import Link from 'next/link'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/json-ld'
import { getIndexableSectors, MIN_COMPANIES_FOR_PAGE } from '@/lib/sector-server'
import { getAllIndustries } from '@/lib/industry'
import { DATA_SOURCE, UPDATE_CADENCE } from '@/lib/site-facts'
import { formatMarketCap } from '@/lib/format'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

export const revalidate = 3600

const title = '섹터 전체 목록 — 산업별 섹터와 대표 종목'
const description =
  '섹터킹이 분류한 한국·미국 주식 섹터를 산업별로 모아 보여줍니다. 반도체·AI·방산·원전 등 각 섹터의 종목 수와 시가총액을 확인하고 섹터별 종목 목록으로 이동하세요.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE_URL}/sectors` },
  openGraph: { title: `${title} | Sector King`, description, url: `${BASE_URL}/sectors` },
  twitter: { card: 'summary_large_image', title: `${title} | Sector King`, description },
}

export default async function SectorsIndexPage() {
  const [list, industries] = await Promise.all([getIndexableSectors(), getAllIndustries()])

  // 산업별로 묶는다 — 홈 → 산업 → 섹터 → 종목 크롤 경로에서 이 페이지가 중간 고리다.
  const byIndustry = new Map<string, typeof list>()
  const orphans: typeof list = []
  for (const sector of list) {
    if (!sector.industryId) {
      orphans.push(sector)
      continue
    }
    const bucket = byIndustry.get(sector.industryId) ?? []
    bucket.push(sector)
    byIndustry.set(sector.industryId, bucket)
  }

  const groups = industries
    .map((industry) => ({ industry, sectors: byIndustry.get(industry.id) ?? [] }))
    .filter((group) => group.sectors.length > 0)

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '섹터', url: `${BASE_URL}/sectors` },
        ]}
      />
      <ItemListJsonLd
        name="섹터킹 섹터 목록"
        description={description}
        items={list.map((sector) => ({
          name: sector.name,
          url: `${BASE_URL}/sectors/${sector.id}`,
        }))}
      />

      <GlobalTopBar subtitle="섹터 목록" />

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <header className="max-w-3xl">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            섹터 전체 목록 — 산업별 섹터와 대표 종목
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            섹터킹은 한국·미국 상장 종목을 {industries.length}개 산업 아래 섹터 단위로 분류합니다.
            아래는 종목이 {MIN_COMPANIES_FOR_PAGE}개 이상이라 개별 페이지를 제공하는 섹터{' '}
            {list.length}개이며, 각 섹터를 누르면 그 섹터에 속한 종목의 시가총액과 등락을 볼 수
            있습니다. 종목이 1~2개뿐인 섹터는 해당 종목 페이지가 같은 정보를 담고 있어 별도
            페이지를 만들지 않았습니다.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            갱신 {UPDATE_CADENCE} · 출처 {DATA_SOURCE}
          </p>
        </header>

        <div className="mt-8 space-y-10">
          {groups.map(({ industry, sectors }) => (
            <section key={industry.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {industry.name}
                </h2>
                <Link
                  href={`/${industry.id}`}
                  className="text-sm text-info hover:underline"
                >
                  {industry.name} 산업 지도
                </Link>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {sectors.map((sector) => (
                  <li key={sector.id} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/sectors/${sector.id}`}
                      className="truncate text-sm text-info hover:underline"
                    >
                      {sector.name}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {sector.companyCount}종목 · {formatMarketCap(sector.marketCapUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {orphans.length > 0 ? (
            <section>
              <h2 className="border-b border-border pb-2 font-display text-lg font-semibold text-foreground">
                기타
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {orphans.map((sector) => (
                  <li key={sector.id} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/sectors/${sector.id}`}
                      className="truncate text-sm text-info hover:underline"
                    >
                      {sector.name}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {sector.companyCount}종목 · {formatMarketCap(sector.marketCapUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <nav className="mt-10" aria-label="관련 페이지">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li>
              <Link href="/" className="text-info hover:underline">전체 산업 지도</Link>
            </li>
            <li>
              <Link href="/market-size" className="text-info hover:underline">시장 규모 지도</Link>
            </li>
            <li>
              <Link href="/rankings" className="text-info hover:underline">전 종목 점수 랭킹</Link>
            </li>
            <li>
              <Link href="/methodology" className="text-info hover:underline">분류·산출 방법론</Link>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  )
}
