import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  categories,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql, desc, gte, and, inArray } from 'drizzle-orm'
import type {
  ApiResponse,
  TrendResponse,
  TrendItem,
  CategoryMarketCap,
  SectorGrowth,
} from '@/types'

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
    const type = searchParams.get('type') || 'sector'
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
    const days = searchParams.get('days') || '30'

    const db = getDb()

    // Calculate date range
    const daysNum = days === 'all' ? 365 : parseInt(days, 10)
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
      const items = await getSectorTrends(db, ids, dates)
      const sectorGrowth = await getSectorGrowth(db, dates)

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
      const items = await getCategoryTrends(db, ids, dates)
      const categoryMarketCaps = await getCategoryMarketCaps(db, dates[dates.length - 1])

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
      const items = await getCompanyTrends(db, ids, dates)

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
  dates: string[]
): Promise<TrendItem[]> {
  // Get all sectors with their companies
  const sectorData = await db
    .select({
      sectorId: sectors.id,
      sectorName: sectors.name,
      ticker: sectorCompanies.ticker,
    })
    .from(sectors)
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

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

  // Build snapshot lookup
  const snapshotLookup = new Map<string, Map<string, number>>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!snapshotLookup.has(snapshot.ticker)) {
      snapshotLookup.set(snapshot.ticker, new Map())
    }
    snapshotLookup.get(snapshot.ticker)!.set(snapshot.date, snapshot.marketCap || 0)
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
  dates: string[]
): Promise<TrendItem[]> {
  // Get all categories with their sectors and companies
  const categoryData = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      sectorId: sectors.id,
      ticker: sectorCompanies.ticker,
    })
    .from(categories)
    .leftJoin(sectors, eq(categories.id, sectors.categoryId))
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

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

  // Build snapshot lookup
  const snapshotLookup = new Map<string, Map<string, number>>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!snapshotLookup.has(snapshot.ticker)) {
      snapshotLookup.set(snapshot.ticker, new Map())
    }
    snapshotLookup.get(snapshot.ticker)!.set(snapshot.date, snapshot.marketCap || 0)
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
  dates: string[]
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
      .limit(5)

    tickers = topCompanies.map((c) => c.ticker).filter((t): t is string => t !== null)
  }

  if (tickers.length === 0) {
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
        inArray(dailySnapshots.ticker, tickers),
        inArray(dailySnapshots.date, dates)
      )
    )

  // Group by ticker
  const tickerDataMap = new Map<string, { date: string; marketCap: number }[]>()
  for (const snapshot of snapshots) {
    if (!snapshot.ticker || !snapshot.date) continue
    if (!tickerDataMap.has(snapshot.ticker)) {
      tickerDataMap.set(snapshot.ticker, [])
    }
    tickerDataMap.get(snapshot.ticker)!.push({
      date: snapshot.date,
      marketCap: snapshot.marketCap || 0,
    })
  }

  const items: TrendItem[] = []
  for (const ticker of tickers) {
    const data = tickerDataMap.get(ticker) || []
    data.sort((a, b) => a.date.localeCompare(b.date))
    items.push({
      id: ticker,
      name: ticker,
      data,
    })
  }

  return items
}

async function getCategoryMarketCaps(
  db: ReturnType<typeof getDb>,
  latestDate: string
): Promise<CategoryMarketCap[]> {
  const categoryData = await db
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
      snapshotMap.set(snapshot.ticker, snapshot.marketCap || 0)
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

  return result.sort((a, b) => b.marketCap - a.marketCap)
}

async function getSectorGrowth(
  db: ReturnType<typeof getDb>,
  dates: string[]
): Promise<SectorGrowth[]> {
  if (dates.length < 2) return []

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Get sector data
  const sectorData = await db
    .select({
      sectorId: sectors.id,
      sectorName: sectors.name,
      sectorNameEn: sectors.nameEn,
      categoryId: sectors.categoryId,
      ticker: sectorCompanies.ticker,
    })
    .from(sectors)
    .leftJoin(sectorCompanies, eq(sectors.id, sectorCompanies.sectorId))

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
    if (snapshot.date === startDate) {
      startSnapshotMap.set(snapshot.ticker, snapshot.marketCap || 0)
    } else if (snapshot.date === endDate) {
      endSnapshotMap.set(snapshot.ticker, snapshot.marketCap || 0)
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

  return result.sort((a, b) => b.growthRate - a.growthRate)
}
