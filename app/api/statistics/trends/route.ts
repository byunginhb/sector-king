import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  categories,
  sectorCompanies,
  dailySnapshots,
  companies,
} from '@/drizzle/schema'
import { eq, sql, desc, gte, and, inArray } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import type {
  ApiResponse,
  TrendResponse,
  TrendItem,
  CategoryMarketCap,
  SectorGrowth,
  IndustryFilterResult,
} from '@/types'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'

export const revalidate = 3600 // 1 hour cache

interface TrendsResponseData extends TrendResponse {
  categories?: CategoryMarketCap[]
  sectorGrowth?: SectorGrowth[]
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TrendsResponseData>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const ALLOWED_TYPES = ['sector', 'category', 'company'] as const
    const rawType = searchParams.get('type') || 'sector'
    const type = (ALLOWED_TYPES as readonly string[]).includes(rawType) ? rawType : 'sector'
    const ids = searchParams.get('ids')?.split(',').filter(Boolean).slice(0, 50) || []
    const days = searchParams.get('days') || '30'
    const industryId = searchParams.get('industry')

    if (industryId && !validateIndustryId(industryId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid industry ID' },
        { status: 400 }
      )
    }

    const db = getDb()
    const industryFilter = industryId ? await getIndustryFilter(industryId) : null

    if (industryId && !industryFilter) {
      return NextResponse.json(
        { success: false, error: 'Industry not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const parsed = parseInt(days, 10)
    const daysNum = days === 'all' ? 365 : (Number.isNaN(parsed) ? 30 : Math.max(1, Math.min(parsed, 365)))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get available dates
    const availableDates = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, startDateStr))
      .orderBy(dailySnapshots.date)

    const dates = availableDates.map((d) => d.date).filter((d): d is string => d !== null)

    if (dates.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          dateRange: { start: startDateStr, end: startDateStr },
        },
      })
    }

    const dateRange = {
      start: dates[0],
      end: dates[dates.length - 1],
    }

    if (type === 'sector') {
      // Get sector trend data
      const items = await getSectorTrends(db, ids, dates, industryFilter)
      const sectorGrowth = await getSectorGrowth(db, dates, industryFilter)

      return NextResponse.json({
        success: true,
        data: {
          items,
          dateRange,
          sectorGrowth,
        },
      })
    } else if (type === 'category') {
      // Get category trend data
      const items = await getCategoryTrends(db, ids, dates, industryFilter)
      const categoryMarketCaps = await getCategoryMarketCaps(db, dates[dates.length - 1], industryFilter)

      return NextResponse.json({
        success: true,
        data: {
          items,
          dateRange,
          categories: categoryMarketCaps,
        },
      })
    } else if (type === 'company') {
      // Get company trend data
      const items = await getCompanyTrends(db, ids, dates, industryFilter)

      return NextResponse.json({
        success: true,
        data: {
          items,
          dateRange,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        items: [],
        dateRange,
      },
    })
  } catch (error) {
    console.error('Statistics Trends API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    )
  }
}

async function getSectorTrends(
  db: ReturnType<typeof getDb>,
  sectorIds: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null
): Promise<TrendItem[]> {
  // Get all sectors with their companies
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

  // Filter by sectorIds if provided, otherwise get top 5 by company count
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

  let targetSectorIds = sectorIds
  if (targetSectorIds.length === 0) {
    // Get top 5 sectors by number of companies
    const sortedSectors = Array.from(sectorCompanyMap.entries())
      .sort((a, b) => b[1].tickers.length - a[1].tickers.length)
      .slice(0, 5)
    targetSectorIds = sortedSectors.map(([id]) => id)
  }

  // Get all snapshots for the date range
  const allTickers = new Set<string>()
  for (const sectorId of targetSectorIds) {
    const sector = sectorCompanyMap.get(sectorId)
    if (sector) {
      sector.tickers.forEach((t) => allTickers.add(t))
    }
  }

  if (allTickers.size === 0) {
    return []
  }

  const snapshots = await db
    .select({
      ticker: dailySnapshots.ticker,
      date: dailySnapshots.date,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.ticker, Array.from(allTickers)),
        inArray(dailySnapshots.date, dates)
      )
    )

  // Build snapshot lookup (with currency conversion)
  const snapshotLookup = new Map<string, Map<string, number>>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!snapshotLookup.has(snapshot.ticker)) {
      snapshotLookup.set(snapshot.ticker, new Map())
    }
    snapshotLookup.get(snapshot.ticker)!.set(
      snapshot.date,
      toUsd(snapshot.marketCap || 0, snapshot.ticker)
    )
  }

  // Build trend items
  const items: TrendItem[] = []
  for (const sectorId of targetSectorIds) {
    const sector = sectorCompanyMap.get(sectorId)
    if (!sector) continue

    const data = dates.map((date) => {
      let totalMarketCap = 0
      for (const ticker of sector.tickers) {
        const tickerSnapshots = snapshotLookup.get(ticker)
        if (tickerSnapshots) {
          totalMarketCap += tickerSnapshots.get(date) || 0
        }
      }
      return { date, marketCap: totalMarketCap }
    })

    items.push({
      id: sectorId,
      name: sector.name,
      data,
    })
  }

  return items
}

async function getCategoryTrends(
  db: ReturnType<typeof getDb>,
  categoryIds: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null
): Promise<TrendItem[]> {
  // Get all categories with their sectors and companies
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
    ? categoryDataRaw.filter(
        (r) => r.categoryId && industryFilter.categoryIds.includes(r.categoryId)
      )
    : categoryDataRaw

  // Build category -> tickers map
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

  let targetCategoryIds = categoryIds
  if (targetCategoryIds.length === 0) {
    targetCategoryIds = Array.from(categoryTickerMap.keys()).slice(0, 5)
  }

  // Get all tickers
  const allTickers = new Set<string>()
  for (const categoryId of targetCategoryIds) {
    const category = categoryTickerMap.get(categoryId)
    if (category) {
      category.tickers.forEach((t) => allTickers.add(t))
    }
  }

  if (allTickers.size === 0) {
    return []
  }

  const snapshots = await db
    .select({
      ticker: dailySnapshots.ticker,
      date: dailySnapshots.date,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.ticker, Array.from(allTickers)),
        inArray(dailySnapshots.date, dates)
      )
    )

  // Build snapshot lookup (with currency conversion)
  const snapshotLookup = new Map<string, Map<string, number>>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!snapshotLookup.has(snapshot.ticker)) {
      snapshotLookup.set(snapshot.ticker, new Map())
    }
    snapshotLookup.get(snapshot.ticker)!.set(
      snapshot.date,
      toUsd(snapshot.marketCap || 0, snapshot.ticker)
    )
  }

  // Build trend items
  const items: TrendItem[] = []
  for (const categoryId of targetCategoryIds) {
    const category = categoryTickerMap.get(categoryId)
    if (!category) continue

    const data = dates.map((date) => {
      let totalMarketCap = 0
      for (const ticker of category.tickers) {
        const tickerSnapshots = snapshotLookup.get(ticker)
        if (tickerSnapshots) {
          totalMarketCap += tickerSnapshots.get(date) || 0
        }
      }
      return { date, marketCap: totalMarketCap }
    })

    items.push({
      id: categoryId,
      name: category.name,
      data,
    })
  }

  return items
}

async function getCompanyTrends(
  db: ReturnType<typeof getDb>,
  tickers: string[],
  dates: string[],
  industryFilter: IndustryFilterResult | null
): Promise<TrendItem[]> {
  if (tickers.length === 0) {
    // Get top 5 companies by market cap
    const topCompanies = await db
      .select({
        ticker: dailySnapshots.ticker,
        marketCap: dailySnapshots.marketCap,
      })
      .from(dailySnapshots)
      .where(
        sql`${dailySnapshots.date} = (SELECT MAX(date) FROM daily_snapshots)`
      )
      .orderBy(desc(dailySnapshots.marketCap))
      .limit(industryFilter ? 100 : 5)

    const allTop = topCompanies.map((c) => c.ticker).filter((t): t is string => t !== null)
    tickers = industryFilter
      ? allTop.filter((t) => industryFilter.tickers.includes(t)).slice(0, 5)
      : allTop
  }

  if (tickers.length === 0) {
    return []
  }

  // Get company names
  const companyData = await db
    .select({
      ticker: companies.ticker,
      name: companies.name,
      nameKo: companies.nameKo,
    })
    .from(companies)
    .where(inArray(companies.ticker, tickers))

  const companyNameMap = new Map<string, { name: string; nameKo: string | null }>()
  for (const company of companyData) {
    companyNameMap.set(company.ticker, {
      name: company.name,
      nameKo: company.nameKo,
    })
  }

  const snapshots = await db
    .select({
      ticker: dailySnapshots.ticker,
      date: dailySnapshots.date,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.ticker, tickers),
        inArray(dailySnapshots.date, dates)
      )
    )

  // Group by ticker (with currency conversion)
  const tickerDataMap = new Map<string, { date: string; marketCap: number }[]>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!tickerDataMap.has(snapshot.ticker)) {
      tickerDataMap.set(snapshot.ticker, [])
    }
    tickerDataMap.get(snapshot.ticker)!.push({
      date: snapshot.date,
      marketCap: toUsd(snapshot.marketCap || 0, snapshot.ticker),
    })
  }

  const items: TrendItem[] = []
  for (const ticker of tickers) {
    const rawData = tickerDataMap.get(ticker) || []
    const sortedData = [...rawData].sort((a, b) => a.date.localeCompare(b.date))
    const companyInfo = companyNameMap.get(ticker)
    items.push({
      id: ticker,
      name: companyInfo?.name || ticker,
      nameKo: companyInfo?.nameKo,
      data: sortedData,
    })
  }

  return items
}

async function getCategoryMarketCaps(
  db: ReturnType<typeof getDb>,
  latestDate: string,
  industryFilter: IndustryFilterResult | null
): Promise<CategoryMarketCap[]> {
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
    ? categoryDataRaw.filter(
        (r) => r.categoryId && industryFilter.categoryIds.includes(r.categoryId)
      )
    : categoryDataRaw

  // Build category -> tickers and sectors map
  const categoryMap = new Map<string, {
    name: string
    nameEn: string | null
    tickers: Set<string>
    sectors: Set<string>
  }>()

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

  // Get latest snapshots
  const allTickers = new Set<string>()
  for (const category of categoryMap.values()) {
    category.tickers.forEach((t) => allTickers.add(t))
  }

  const snapshots = await db
    .select({
      ticker: dailySnapshots.ticker,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.ticker, Array.from(allTickers)),
        eq(dailySnapshots.date, latestDate)
      )
    )

  const snapshotMap = new Map<string, number>()
  for (const snapshot of snapshots) {
    if (snapshot.ticker) {
      snapshotMap.set(snapshot.ticker, toUsd(snapshot.marketCap || 0, snapshot.ticker))
    }
  }

  const result: CategoryMarketCap[] = []
  for (const [id, category] of categoryMap) {
    let totalMarketCap = 0
    for (const ticker of category.tickers) {
      totalMarketCap += snapshotMap.get(ticker) || 0
    }
    result.push({
      id,
      name: category.name,
      nameEn: category.nameEn,
      marketCap: totalMarketCap,
      sectorCount: category.sectors.size,
    })
  }

  return [...result].sort((a, b) => b.marketCap - a.marketCap)
}

async function getSectorGrowth(
  db: ReturnType<typeof getDb>,
  dates: string[],
  industryFilter: IndustryFilterResult | null
): Promise<SectorGrowth[]> {
  if (dates.length < 2) return []

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Get sector data
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
    ? sectorDataRaw.filter(
        (r) => r.sectorId && industryFilter.sectorIds.includes(r.sectorId)
      )
    : sectorDataRaw

  const sectorTickerMap = new Map<string, {
    name: string
    nameEn: string | null
    categoryId: string | null
    tickers: string[]
  }>()

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

  // Get snapshots for start and end dates
  const allTickers = new Set<string>()
  for (const sector of sectorTickerMap.values()) {
    sector.tickers.forEach((t) => allTickers.add(t))
  }

  const snapshots = await db
    .select({
      ticker: dailySnapshots.ticker,
      date: dailySnapshots.date,
      marketCap: dailySnapshots.marketCap,
    })
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.ticker, Array.from(allTickers)),
        inArray(dailySnapshots.date, [startDate, endDate])
      )
    )

  const startSnapshotMap = new Map<string, number>()
  const endSnapshotMap = new Map<string, number>()

  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    const converted = toUsd(snapshot.marketCap || 0, snapshot.ticker)
    if (snapshot.date === startDate) {
      startSnapshotMap.set(snapshot.ticker, converted)
    } else if (snapshot.date === endDate) {
      endSnapshotMap.set(snapshot.ticker, converted)
    }
  }

  const result: SectorGrowth[] = []
  for (const [id, sector] of sectorTickerMap) {
    let startMarketCap = 0
    let endMarketCap = 0
    for (const ticker of sector.tickers) {
      startMarketCap += startSnapshotMap.get(ticker) || 0
      endMarketCap += endSnapshotMap.get(ticker) || 0
    }

    const growthRate = startMarketCap > 0
      ? ((endMarketCap - startMarketCap) / startMarketCap) * 100
      : 0

    result.push({
      id,
      name: sector.name,
      nameEn: sector.nameEn,
      categoryId: sector.categoryId,
      startMarketCap,
      endMarketCap,
      growthRate,
    })
  }

  return [...result].sort((a, b) => b.growthRate - a.growthRate)
}
