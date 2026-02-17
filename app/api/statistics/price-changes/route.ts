import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { companies, dailySnapshots } from '@/drizzle/schema'
import { and, inArray, sql } from 'drizzle-orm'
import type { ApiResponse, PriceChangesResponse, PriceChangeItem } from '@/types'
import { toUsd } from '@/lib/currency'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'

export const revalidate = 3600 // 1 hour cache

const ALLOWED_SORTS = ['percentChange', 'name', 'marketCap'] as const
const ALLOWED_ORDERS = ['asc', 'desc'] as const

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PriceChangesResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawSort = searchParams.get('sort') || 'percentChange'
    const rawOrder = searchParams.get('order') || 'desc'
    const sort = (ALLOWED_SORTS as readonly string[]).includes(rawSort) ? rawSort : 'percentChange'
    const order = (ALLOWED_ORDERS as readonly string[]).includes(rawOrder) ? rawOrder : 'desc'
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

    // Get all unique tickers
    const allTickersRaw = await db
      .selectDistinct({ ticker: dailySnapshots.ticker })
      .from(dailySnapshots)

    const allTickers = industryFilter
      ? allTickersRaw.filter((t) => t.ticker && industryFilter.tickers.includes(t.ticker))
      : allTickersRaw

    const tickerList = allTickers
      .map((t) => t.ticker)
      .filter((t): t is string => t !== null)

    if (tickerList.length === 0) {
      return NextResponse.json({
        success: true,
        data: { companies: [], dateRange: { start: '', end: '' }, total: 0 },
      })
    }

    // Step 1: Get min/max dates per ticker using GROUP BY (efficient - single scan)
    const dateRanges = await db
      .select({
        ticker: dailySnapshots.ticker,
        minDate: sql<string>`MIN(${dailySnapshots.date})`,
        maxDate: sql<string>`MAX(${dailySnapshots.date})`,
      })
      .from(dailySnapshots)
      .where(inArray(dailySnapshots.ticker, tickerList))
      .groupBy(dailySnapshots.ticker)

    // Build date lookup
    const tickerDateMap = new Map<string, { minDate: string; maxDate: string }>()
    const targetDatesSet = new Set<string>()
    for (const row of dateRanges) {
      if (!row.ticker || !row.minDate || !row.maxDate) continue
      tickerDateMap.set(row.ticker, { minDate: row.minDate, maxDate: row.maxDate })
      targetDatesSet.add(row.minDate)
      targetDatesSet.add(row.maxDate)
    }

    const targetDates = Array.from(targetDatesSet)
    if (targetDates.length === 0) {
      return NextResponse.json({
        success: true,
        data: { companies: [], dateRange: { start: '', end: '' }, total: 0 },
      })
    }

    // Step 2: Fetch only the snapshots for min/max dates (much smaller result set)
    const [targetSnapshots, companyInfoList] = await Promise.all([
      db
        .select({
          ticker: dailySnapshots.ticker,
          date: dailySnapshots.date,
          price: dailySnapshots.price,
          marketCap: dailySnapshots.marketCap,
        })
        .from(dailySnapshots)
        .where(
          and(
            inArray(dailySnapshots.ticker, tickerList),
            inArray(dailySnapshots.date, targetDates)
          )
        ),
      db
        .select({
          ticker: companies.ticker,
          name: companies.name,
          nameKo: companies.nameKo,
        })
        .from(companies)
        .where(inArray(companies.ticker, tickerList)),
    ])

    // Build snapshot index by (ticker, date)
    const snapshotIndex = new Map<string, { price: number | null; marketCap: number | null }>()
    for (const snap of targetSnapshots) {
      if (!snap.ticker || !snap.date) continue
      snapshotIndex.set(`${snap.ticker}|${snap.date}`, {
        price: snap.price,
        marketCap: snap.marketCap,
      })
    }

    const companyMap = new Map<string, { name: string; nameKo: string | null }>()
    for (const c of companyInfoList) {
      companyMap.set(c.ticker, { name: c.name, nameKo: c.nameKo })
    }

    // Build price changes in-memory
    const priceChanges: PriceChangeItem[] = []

    for (const ticker of tickerList) {
      const dates = tickerDateMap.get(ticker)
      if (!dates) continue

      const first = snapshotIndex.get(`${ticker}|${dates.minDate}`)
      const latest = snapshotIndex.get(`${ticker}|${dates.maxDate}`)
      if (!first || !latest) continue

      const company = companyMap.get(ticker)

      const priceChange =
        first.price && latest.price ? latest.price - first.price : null
      const percentChange =
        first.price && latest.price
          ? ((latest.price - first.price) / first.price) * 100
          : null

      priceChanges.push({
        ticker,
        name: company?.name || ticker,
        nameKo: company?.nameKo || null,
        firstPrice: first.price,
        firstDate: dates.minDate,
        latestPrice: latest.price,
        latestDate: dates.maxDate,
        priceChange,
        percentChange,
        marketCap: latest.marketCap ? toUsd(latest.marketCap, ticker) : null,
      })
    }

    // Sort results (immutable)
    const sortedChanges = [...priceChanges].sort((a, b) => {
      let comparison = 0
      switch (sort) {
        case 'percentChange':
          comparison = (b.percentChange ?? 0) - (a.percentChange ?? 0)
          break
        case 'name':
          comparison = (a.nameKo || a.name).localeCompare(b.nameKo || b.name)
          break
        case 'marketCap':
          comparison = (b.marketCap ?? 0) - (a.marketCap ?? 0)
          break
        default:
          comparison = (b.percentChange ?? 0) - (a.percentChange ?? 0)
      }
      return order === 'asc' ? -comparison : comparison
    })

    // Get date range
    const allDates = sortedChanges
      .flatMap((c) => [c.firstDate, c.latestDate])
      .filter((d) => d.length > 0)
      .sort()

    return NextResponse.json({
      success: true,
      data: {
        companies: sortedChanges,
        dateRange: {
          start: allDates[0] || '',
          end: allDates[allDates.length - 1] || '',
        },
        total: sortedChanges.length,
      },
    })
  } catch (error) {
    console.error('Price Changes API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price changes data' },
      { status: 500 }
    )
  }
}
