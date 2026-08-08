import 'server-only'
import { cache } from 'react'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  categories,
  companies,
  dailySnapshots,
  industries,
  industryCategories,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { toUsd } from '@/lib/currency'

/**
 * `/sectors/{id}` 섹터 상세 라우트의 데이터 계층.
 *
 * 왜 필요했나: 섹터는 이 서비스의 핵심 분류 단위인데 **고유 URL 이 없었다**. 지도에서
 * 클릭하면 클라이언트 드릴다운으로 바뀔 뿐이라 공유·링크·색인이 전부 불가능했고,
 * "반도체 대표 종목", "방산 섹터 종목" 같은 검색이 착지할 페이지도 없었다.
 * 홈 → 산업 → 섹터 → 종목 으로 이어지는 크롤 경로의 끊긴 고리이기도 하다.
 *
 * 통화 규칙: 가격·시가총액은 전부 `toUsd(value, ticker)` 후 반환/합산한다.
 */

/**
 * 페이지를 만들 최소 종목 수.
 *
 * 143개 섹터 중 34개는 종목이 1~2개뿐이라, 페이지를 만들어도 그 종목의 `/stock/{ticker}`
 * 를 되풀이하는 얇은 페이지가 된다. 3개부터는 "이 섹터엔 누가 있나"에 실제로 답이 되므로
 * 여기를 경계로 삼는다(109개). 종목 수는 티커를 넣고 뺄 때만 바뀌므로, 시가총액 순위로
 * 자르는 것과 달리 이미 색인된 URL 이 시세 때문에 404 로 사라지지 않는다.
 */
export const MIN_COMPANIES_FOR_PAGE = 3

/** 기간 변화율 비교 창(거래일). lib/seo-snapshot 과 같은 기준을 쓴다. */
const CHANGE_WINDOW = 14

export interface SectorListItem {
  id: string
  name: string
  companyCount: number
  marketCapUsd: number
  categoryId: string
  categoryName: string
  industryId: string | null
  industryName: string | null
}

export interface SectorCompanyRow {
  ticker: string
  name: string
  nameKo: string | null
  isKorean: boolean
  marketCapUsd: number | null
  priceUsd: number | null
  priceChangePct: number | null
}

export interface SectorDetail {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  categoryId: string
  categoryName: string
  /** 이 섹터가 노출되는 산업 전부(M:N). */
  industries: { id: string; name: string }[]
  /** GICS 기준 대표 산업 — 빵부스러기와 "상위" 링크에 쓴다. */
  primaryIndustry: { id: string; name: string } | null
  companies: SectorCompanyRow[]
  marketCapUsd: number
  changePct: number | null
  date: string | null
  baseDate: string | null
  /** 같은 카테고리의 다른 섹터(색인 대상만). */
  relatedSectors: { id: string; name: string; companyCount: number }[]
}

/** 최신 거래일과 기간 비교 기준일. */
const getDates = cache(async (): Promise<{ latest: string | null; base: string | null }> => {
  const db = getDb()
  const rows = await db
    .selectDistinct({ date: dailySnapshots.date })
    .from(dailySnapshots)
    .orderBy(desc(dailySnapshots.date))
    .limit(CHANGE_WINDOW + 1)

  const dates = rows.map((r) => r.date).filter((d): d is string => !!d)
  const latest = dates[0] ?? null
  const base = dates.length > 1 ? dates[dates.length - 1] : null
  return { latest, base }
})

/**
 * 페이지를 만들 섹터 목록 — `/sectors` 인덱스, generateStaticParams, sitemap 이 공유한다.
 * 세 곳이 같은 원천을 봐야 "sitemap 에는 있는데 404" 같은 어긋남이 안 생긴다.
 */
export const getIndexableSectors = cache(async (): Promise<SectorListItem[]> => {
  const db = getDb()
  const { latest } = await getDates()

  const rows = await db
    .select({
      id: sectors.id,
      name: sectors.name,
      categoryId: categories.id,
      categoryName: categories.name,
      companyCount: sql<number>`count(distinct ${sectorCompanies.ticker})`,
    })
    .from(sectors)
    .innerJoin(categories, eq(sectors.categoryId, categories.id))
    .innerJoin(sectorCompanies, eq(sectorCompanies.sectorId, sectors.id))
    .groupBy(sectors.id)
    .having(sql`count(distinct ${sectorCompanies.ticker}) >= ${MIN_COMPANIES_FOR_PAGE}`)

  if (rows.length === 0) return []

  // 카테고리 → 대표 산업 (is_primary). 시총 지도와 같은 배타적 귀속 기준.
  const primaryRows = await db
    .select({
      categoryId: industryCategories.categoryId,
      industryId: industries.id,
      industryName: industries.name,
    })
    .from(industryCategories)
    .innerJoin(industries, eq(industryCategories.industryId, industries.id))
    .where(eq(industryCategories.isPrimary, true))

  const primaryByCategory = new Map(primaryRows.map((r) => [r.categoryId, r]))

  // 섹터별 시가총액 — 최신 스냅샷만 읽는다.
  const capRows = latest
    ? await db
        .select({
          sectorId: sectorCompanies.sectorId,
          ticker: sectorCompanies.ticker,
          marketCap: dailySnapshots.marketCap,
        })
        .from(sectorCompanies)
        .innerJoin(
          dailySnapshots,
          and(
            eq(dailySnapshots.ticker, sectorCompanies.ticker),
            eq(dailySnapshots.date, latest)
          )
        )
    : []

  const capBySector = new Map<string, number>()
  for (const row of capRows) {
    if (!row.sectorId || !row.ticker) continue
    capBySector.set(
      row.sectorId,
      (capBySector.get(row.sectorId) ?? 0) + toUsd(row.marketCap ?? 0, row.ticker)
    )
  }

  return rows
    .map((row) => {
      const primary = row.categoryId ? primaryByCategory.get(row.categoryId) : undefined
      return {
        id: row.id,
        name: row.name,
        companyCount: Number(row.companyCount),
        marketCapUsd: capBySector.get(row.id) ?? 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        industryId: primary?.industryId ?? null,
        industryName: primary?.industryName ?? null,
      }
    })
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
})

/** 섹터 상세. 색인 대상이 아니거나 없는 id 면 null (라우트에서 404). */
export const getSectorDetail = cache(
  async (sectorId: string): Promise<SectorDetail | null> => {
    const db = getDb()
    const { latest, base } = await getDates()

    const [sector] = await db
      .select({
        id: sectors.id,
        name: sectors.name,
        nameEn: sectors.nameEn,
        description: sectors.description,
        categoryId: categories.id,
        categoryName: categories.name,
      })
      .from(sectors)
      .innerJoin(categories, eq(sectors.categoryId, categories.id))
      .where(eq(sectors.id, sectorId))
      .limit(1)

    if (!sector) return null

    const memberRows = await db
      .select({
        ticker: companies.ticker,
        name: companies.name,
        nameKo: companies.nameKo,
        region: companies.region,
      })
      .from(sectorCompanies)
      .innerJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .where(eq(sectorCompanies.sectorId, sectorId))

    if (memberRows.length < MIN_COMPANIES_FOR_PAGE) return null

    const tickers = memberRows.map((m) => m.ticker)

    // 최신 + 기준일 두 날짜만 읽는다.
    const wantedDates = [latest, base].filter((d): d is string => !!d)
    const snapshotRows = wantedDates.length
      ? await db
          .select({
            ticker: dailySnapshots.ticker,
            date: dailySnapshots.date,
            marketCap: dailySnapshots.marketCap,
            price: dailySnapshots.price,
            priceChange: dailySnapshots.priceChange,
          })
          .from(dailySnapshots)
          .where(
            and(
              inArray(dailySnapshots.ticker, tickers),
              inArray(dailySnapshots.date, wantedDates)
            )
          )
      : []

    const latestByTicker = new Map<string, (typeof snapshotRows)[number]>()
    const baseCapByTicker = new Map<string, number>()
    for (const row of snapshotRows) {
      if (!row.ticker) continue
      if (row.date === latest) latestByTicker.set(row.ticker, row)
      else if (row.date === base) {
        baseCapByTicker.set(row.ticker, toUsd(row.marketCap ?? 0, row.ticker))
      }
    }

    const companyRows: SectorCompanyRow[] = memberRows
      .map((member) => {
        const snap = latestByTicker.get(member.ticker)
        return {
          ticker: member.ticker,
          name: member.name,
          nameKo: member.nameKo,
          isKorean: member.region === 'KR',
          marketCapUsd: snap ? toUsd(snap.marketCap ?? 0, member.ticker) : null,
          priceUsd: snap?.price != null ? toUsd(snap.price, member.ticker) : null,
          // daily_snapshots.price_change 는 % 라 통화 변환 불요.
          priceChangePct: snap?.priceChange ?? null,
        }
      })
      .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))

    // 기간 변화율: 양쪽 날짜에 다 있는 종목만 분모에 넣는다(구성 변경 왜곡 방지).
    let pairedLatest = 0
    let pairedBase = 0
    for (const row of companyRows) {
      const prev = baseCapByTicker.get(row.ticker)
      if (row.marketCapUsd != null && prev != null && prev > 0) {
        pairedLatest += row.marketCapUsd
        pairedBase += prev
      }
    }

    const industryRows = await db
      .select({ id: industries.id, name: industries.name, isPrimary: industryCategories.isPrimary })
      .from(industryCategories)
      .innerJoin(industries, eq(industryCategories.industryId, industries.id))
      .where(eq(industryCategories.categoryId, sector.categoryId))
      .orderBy(industries.order)

    const siblings = (await getIndexableSectors()).filter(
      (s) => s.categoryId === sector.categoryId && s.id !== sectorId
    )

    return {
      ...sector,
      industries: industryRows.map(({ id, name }) => ({ id, name })),
      primaryIndustry: industryRows.find((i) => i.isPrimary) ?? industryRows[0] ?? null,
      companies: companyRows,
      marketCapUsd: companyRows.reduce((sum, c) => sum + (c.marketCapUsd ?? 0), 0),
      changePct: pairedBase > 0 ? ((pairedLatest - pairedBase) / pairedBase) * 100 : null,
      date: latest,
      baseDate: base,
      relatedSectors: siblings.map((s) => ({
        id: s.id,
        name: s.name,
        companyCount: s.companyCount,
      })),
    }
  }
)
