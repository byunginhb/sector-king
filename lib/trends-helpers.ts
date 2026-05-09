import { getDb } from '@/lib/db'
import {
  sectors,
  categories,
  sectorCompanies,
  dailySnapshots,
  companies,
} from '@/drizzle/schema'
import { eq, sql, desc, and, inArray } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { applyRegionFilter, type RegionFilter } from '@/lib/region'
import type {
  TrendItem,
  CategoryMarketCap,
  SectorGrowth,
  IndustryFilterResult,
} from '@/types'

/** 헬퍼들이 region 인자를 옵션으로 받기 위한 공통 시그니처. */
type HelperOpts = { region?: RegionFilter }

/** 티커 배열에 region 마스크. region='all' 이면 입력 그대로. */
function regionMask(tickers: string[], region: RegionFilter | undefined): string[] {
  if (!region || region === 'all') return tickers
  return applyRegionFilter(tickers, region)
}

type DbInstance = ReturnType<typeof getDb>

/**
 * Build a snapshot lookup map indexed by (ticker → date → marketCap in USD).
 */
function buildSnapshotLookup(
  snapshots: { ticker: string | null; date: string | null; marketCap: number | null }[]
): Map<string, Map<string, number>> {
  const lookup = new Map<string, Map<string, number>>()
  for (const snap of snapshots) {
    if (!snap.ticker || !snap.date) continue
    if (!lookup.has(snap.ticker)) {
      lookup.set(snap.ticker, new Map())
    }
    lookup.get(snap.ticker)!.set(
      snap.date,
      toUsd(snap.marketCap || 0, snap.ticker)
    )
  }
  return lookup
}

/**
 * Calculate total market cap for a set of tickers on a given date.
 */
function sumMarketCap(
  tickers: Iterable<string>,
  date: string,
  lookup: Map<string, Map<string, number>>
): number {
  let total = 0
  for (const ticker of tickers) {
    total += lookup.get(ticker)?.get(date) || 0
  }
  return total
}

// ─── Sector Trends ──────────────────────────────────────────────

export async function getSectorTrends(
  db: DbInstance,
  sectorIds: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null,
  opts: HelperOpts = {}
): Promise<TrendItem[]> {
  const { region } = opts
  const sectorDataRaw = await db
    .select({
      sectorId: sectors.id,
      sectorName: sectors.name,
      ticker: sectorCompanies.ticker,
    })
    .from(sectors)
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

  const sectorData = industryFilter
    ? sectorDataRaw.filter((r) => r.sectorId && industryFilter.sectorIds.includes(r.sectorId))
    : sectorDataRaw

  const sectorCompanyMap = new Map<string, { name: string; tickers: string[] }>()
  for (const row of sectorData) {
    if (!row.sectorId) continue
    const existing = sectorCompanyMap.get(row.sectorId)
    if (existing) {
      if (row.ticker) existing.tickers.push(row.ticker)
    } else {
      sectorCompanyMap.set(row.sectorId, {
        name: row.sectorName || '',
        tickers: row.ticker ? [row.ticker] : [],
      })
    }
  }

  // region 마스크: 각 sector 의 tickers 를 좁힌다 (불변, 새 Map)
  if (region && region !== 'all') {
    for (const [id, sector] of sectorCompanyMap) {
      sectorCompanyMap.set(id, {
        name: sector.name,
        tickers: regionMask(sector.tickers, region),
      })
    }
  }

  let targetIds = sectorIds
  if (targetIds.length === 0) {
    targetIds = Array.from(sectorCompanyMap.entries())
      .sort((a, b) => b[1].tickers.length - a[1].tickers.length)
      .slice(0, 5)
      .map(([id]) => id)
  }

  const allTickers = new Set<string>()
  for (const id of targetIds) {
    const sector = sectorCompanyMap.get(id)
    if (sector) {
      for (const t of sector.tickers) allTickers.add(t)
    }
  }

  if (allTickers.size === 0) return []

  const snapshots = await db
    .select({ ticker: dailySnapshots.ticker, date: dailySnapshots.date, marketCap: dailySnapshots.marketCap })
    .from(dailySnapshots)
    .where(and(inArray(dailySnapshots.ticker, Array.from(allTickers)), inArray(dailySnapshots.date, dates)))

  const lookup = buildSnapshotLookup(snapshots)

  return targetIds
    .map((sectorId) => {
      const sector = sectorCompanyMap.get(sectorId)
      if (!sector) return null
      return {
        id: sectorId,
        name: sector.name,
        data: dates.map((date) => ({ date, marketCap: sumMarketCap(sector.tickers, date, lookup) })),
      }
    })
    .filter((item): item is TrendItem => item !== null)
}

// ─── Category Trends ────────────────────────────────────────────

export async function getCategoryTrends(
  db: DbInstance,
  categoryIds: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null,
  opts: HelperOpts = {}
): Promise<TrendItem[]> {
  const { region } = opts
  const categoryDataRaw = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      sectorId: sectors.id,
      ticker: sectorCompanies.ticker,
    })
    .from(categories)
    .leftJoin(sectors, eq(categories.id, sectors.categoryId))
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

  const categoryData = industryFilter
    ? categoryDataRaw.filter((r) => r.categoryId && industryFilter.categoryIds.includes(r.categoryId))
    : categoryDataRaw

  const categoryTickerMap = new Map<string, { name: string; tickers: Set<string> }>()
  for (const row of categoryData) {
    if (!row.categoryId) continue
    const existing = categoryTickerMap.get(row.categoryId)
    if (existing) {
      if (row.ticker) existing.tickers.add(row.ticker)
    } else {
      categoryTickerMap.set(row.categoryId, {
        name: row.categoryName || '',
        tickers: row.ticker ? new Set([row.ticker]) : new Set(),
      })
    }
  }

  // region 마스크
  if (region && region !== 'all') {
    for (const [id, cat] of categoryTickerMap) {
      categoryTickerMap.set(id, {
        name: cat.name,
        tickers: new Set(regionMask(Array.from(cat.tickers), region)),
      })
    }
  }

  let targetIds = categoryIds
  if (targetIds.length === 0) {
    targetIds = Array.from(categoryTickerMap.keys()).slice(0, 5)
  }

  const allTickers = new Set<string>()
  for (const id of targetIds) {
    const cat = categoryTickerMap.get(id)
    if (cat) {
      for (const t of cat.tickers) allTickers.add(t)
    }
  }

  if (allTickers.size === 0) return []

  const snapshots = await db
    .select({ ticker: dailySnapshots.ticker, date: dailySnapshots.date, marketCap: dailySnapshots.marketCap })
    .from(dailySnapshots)
    .where(and(inArray(dailySnapshots.ticker, Array.from(allTickers)), inArray(dailySnapshots.date, dates)))

  const lookup = buildSnapshotLookup(snapshots)

  return targetIds
    .map((catId) => {
      const cat = categoryTickerMap.get(catId)
      if (!cat) return null
      return {
        id: catId,
        name: cat.name,
        data: dates.map((date) => ({ date, marketCap: sumMarketCap(cat.tickers, date, lookup) })),
      }
    })
    .filter((item): item is TrendItem => item !== null)
}

// ─── Company Trends ─────────────────────────────────────────────

export async function getCompanyTrends(
  db: DbInstance,
  tickers: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null,
  opts: HelperOpts = {}
): Promise<TrendItem[]> {
  const { region } = opts
  let targetTickers = tickers

  if (targetTickers.length === 0) {
    const topCompanies = await db
      .select({ ticker: dailySnapshots.ticker, marketCap: dailySnapshots.marketCap })
      .from(dailySnapshots)
      .where(sql`${dailySnapshots.date} = (SELECT MAX(date) FROM daily_snapshots)`)
      .orderBy(desc(dailySnapshots.marketCap))
      .limit(industryFilter ? 200 : 50)

    const allTop = topCompanies.map((c) => c.ticker).filter((t): t is string => t !== null)
    const industryFiltered = industryFilter
      ? allTop.filter((t) => industryFilter.tickers.includes(t))
      : allTop
    const regionFiltered = regionMask(industryFiltered, region)
    targetTickers = regionFiltered.slice(0, 5)
  } else {
    targetTickers = regionMask(targetTickers, region)
  }

  if (targetTickers.length === 0) return []

  const [companyData, snapshots] = await Promise.all([
    db.select({ ticker: companies.ticker, name: companies.name, nameKo: companies.nameKo })
      .from(companies)
      .where(inArray(companies.ticker, targetTickers)),
    db.select({ ticker: dailySnapshots.ticker, date: dailySnapshots.date, marketCap: dailySnapshots.marketCap })
      .from(dailySnapshots)
      .where(and(inArray(dailySnapshots.ticker, targetTickers), inArray(dailySnapshots.date, dates))),
  ])

  const companyNameMap = new Map<string, { name: string; nameKo: string | null }>()
  for (const c of companyData) {
    companyNameMap.set(c.ticker, { name: c.name, nameKo: c.nameKo })
  }

  const tickerDataMap = new Map<string, { date: string; marketCap: number }[]>()
  for (const snap of snapshots) {
    if (!snap.ticker || !snap.date) continue
    if (!tickerDataMap.has(snap.ticker)) {
      tickerDataMap.set(snap.ticker, [])
    }
    tickerDataMap.get(snap.ticker)!.push({
      date: snap.date,
      marketCap: toUsd(snap.marketCap || 0, snap.ticker),
    })
  }

  return targetTickers.map((ticker) => {
    const rawData = tickerDataMap.get(ticker) || []
    const info = companyNameMap.get(ticker)
    return {
      id: ticker,
      name: info?.name || ticker,
      nameKo: info?.nameKo,
      data: [...rawData].sort((a, b) => a.date.localeCompare(b.date)),
    }
  })
}

// ─── Category Market Caps ───────────────────────────────────────

export async function getCategoryMarketCaps(
  db: DbInstance,
  latestDate: string,
  industryFilter: IndustryFilterResult | null,
  opts: HelperOpts = {}
): Promise<CategoryMarketCap[]> {
  const { region } = opts
  const categoryDataRaw = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryNameEn: categories.nameEn,
      sectorId: sectors.id,
      ticker: sectorCompanies.ticker,
    })
    .from(categories)
    .leftJoin(sectors, eq(categories.id, sectors.categoryId))
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

  const categoryData = industryFilter
    ? categoryDataRaw.filter((r) => r.categoryId && industryFilter.categoryIds.includes(r.categoryId))
    : categoryDataRaw

  const categoryMap = new Map<string, { name: string; nameEn: string | null; tickers: Set<string>; sectors: Set<string> }>()
  for (const row of categoryData) {
    if (!row.categoryId) continue
    const existing = categoryMap.get(row.categoryId)
    if (existing) {
      if (row.ticker) existing.tickers.add(row.ticker)
      if (row.sectorId) existing.sectors.add(row.sectorId)
    } else {
      categoryMap.set(row.categoryId, {
        name: row.categoryName || '',
        nameEn: row.categoryNameEn,
        tickers: row.ticker ? new Set([row.ticker]) : new Set(),
        sectors: row.sectorId ? new Set([row.sectorId]) : new Set(),
      })
    }
  }

  // region 마스크 (tickers 만 좁힘 — sectors 집합은 보존)
  if (region && region !== 'all') {
    for (const [id, cat] of categoryMap) {
      categoryMap.set(id, {
        name: cat.name,
        nameEn: cat.nameEn,
        tickers: new Set(regionMask(Array.from(cat.tickers), region)),
        sectors: cat.sectors,
      })
    }
  }

  const allTickers = new Set<string>()
  for (const cat of categoryMap.values()) {
    for (const t of cat.tickers) allTickers.add(t)
  }

  const snapshots = await db
    .select({ ticker: dailySnapshots.ticker, marketCap: dailySnapshots.marketCap })
    .from(dailySnapshots)
    .where(and(inArray(dailySnapshots.ticker, Array.from(allTickers)), eq(dailySnapshots.date, latestDate)))

  const snapshotMap = new Map<string, number>()
  for (const snap of snapshots) {
    if (snap.ticker) {
      snapshotMap.set(snap.ticker, toUsd(snap.marketCap || 0, snap.ticker))
    }
  }

  const result: CategoryMarketCap[] = []
  for (const [id, cat] of categoryMap) {
    let totalMarketCap = 0
    for (const ticker of cat.tickers) {
      totalMarketCap += snapshotMap.get(ticker) || 0
    }
    result.push({ id, name: cat.name, nameEn: cat.nameEn, marketCap: totalMarketCap, sectorCount: cat.sectors.size })
  }

  return [...result].sort((a, b) => b.marketCap - a.marketCap)
}

// ─── Sector Growth ──────────────────────────────────────────────

export async function getSectorGrowth(
  db: DbInstance,
  dates: string[],
  industryFilter: IndustryFilterResult | null,
  opts: HelperOpts = {}
): Promise<SectorGrowth[]> {
  const { region } = opts
  if (dates.length < 2) return []

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  const sectorDataRaw = await db
    .select({
      sectorId: sectors.id,
      sectorName: sectors.name,
      sectorNameEn: sectors.nameEn,
      categoryId: sectors.categoryId,
      ticker: sectorCompanies.ticker,
    })
    .from(sectors)
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

  const sectorData = industryFilter
    ? sectorDataRaw.filter((r) => r.sectorId && industryFilter.sectorIds.includes(r.sectorId))
    : sectorDataRaw

  const sectorTickerMap = new Map<string, { name: string; nameEn: string | null; categoryId: string | null; tickers: string[] }>()
  for (const row of sectorData) {
    if (!row.sectorId) continue
    const existing = sectorTickerMap.get(row.sectorId)
    if (existing) {
      if (row.ticker) existing.tickers.push(row.ticker)
    } else {
      sectorTickerMap.set(row.sectorId, {
        name: row.sectorName || '',
        nameEn: row.sectorNameEn,
        categoryId: row.categoryId,
        tickers: row.ticker ? [row.ticker] : [],
      })
    }
  }

  // region 마스크
  if (region && region !== 'all') {
    for (const [id, sector] of sectorTickerMap) {
      sectorTickerMap.set(id, {
        ...sector,
        tickers: regionMask(sector.tickers, region),
      })
    }
  }

  const allTickers = new Set<string>()
  for (const sector of sectorTickerMap.values()) {
    for (const t of sector.tickers) allTickers.add(t)
  }

  const snapshots = await db
    .select({ ticker: dailySnapshots.ticker, date: dailySnapshots.date, marketCap: dailySnapshots.marketCap })
    .from(dailySnapshots)
    .where(and(inArray(dailySnapshots.ticker, Array.from(allTickers)), inArray(dailySnapshots.date, [startDate, endDate])))

  const startMap = new Map<string, number>()
  const endMap = new Map<string, number>()
  for (const snap of snapshots) {
    if (!snap.ticker || !snap.date) continue
    const converted = toUsd(snap.marketCap || 0, snap.ticker)
    if (snap.date === startDate) startMap.set(snap.ticker, converted)
    else if (snap.date === endDate) endMap.set(snap.ticker, converted)
  }

  const result: SectorGrowth[] = []
  for (const [id, sector] of sectorTickerMap) {
    let startMarketCap = 0
    let endMarketCap = 0
    for (const ticker of sector.tickers) {
      startMarketCap += startMap.get(ticker) || 0
      endMarketCap += endMap.get(ticker) || 0
    }
    result.push({
      id,
      name: sector.name,
      nameEn: sector.nameEn,
      categoryId: sector.categoryId,
      startMarketCap,
      endMarketCap,
      growthRate: startMarketCap > 0 ? ((endMarketCap - startMarketCap) / startMarketCap) * 100 : 0,
    })
  }

  return [...result].sort((a, b) => b.growthRate - a.growthRate)
}
