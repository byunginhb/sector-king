import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { companies, dailySnapshots } from '@/drizzle/schema'
import { eq, asc, desc, sql } from 'drizzle-orm'
import type { ApiResponse, PriceChangesResponse, PriceChangeItem } from '@/types'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<PriceChangesResponse>>> {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'percentChange'
    const order = searchParams.get('order') || 'desc'

    const db = getDb()

    // Get all unique tickers with their first and latest snapshots
    const allTickers = await db
      .selectDistinct({ ticker: dailySnapshots.ticker })
      .from(dailySnapshots)

    const priceChanges: PriceChangeItem[] = []

    for (const { ticker } of allTickers) {
      if (!ticker) continue

      // Get first snapshot (oldest date)
      const firstSnapshot = await db
        .select({
          date: dailySnapshots.date,
          price: dailySnapshots.price,
        })
        .from(dailySnapshots)
        .where(eq(dailySnapshots.ticker, ticker))
        .orderBy(asc(dailySnapshots.date))
        .limit(1)

      // Get latest snapshot (newest date)
      const latestSnapshot = await db
        .select({
          date: dailySnapshots.date,
          price: dailySnapshots.price,
          marketCap: dailySnapshots.marketCap,
        })
        .from(dailySnapshots)
        .where(eq(dailySnapshots.ticker, ticker))
        .orderBy(desc(dailySnapshots.date))
        .limit(1)

      // Get company info
      const companyInfo = await db
        .select({
          name: companies.name,
          nameKo: companies.nameKo,
        })
        .from(companies)
        .where(eq(companies.ticker, ticker))
        .limit(1)

      if (firstSnapshot.length === 0 || latestSnapshot.length === 0) continue

      const first = firstSnapshot[0]
      const latest = latestSnapshot[0]
      const company = companyInfo[0]

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
        firstDate: first.date,
        latestPrice: latest.price,
        latestDate: latest.date,
        priceChange,
        percentChange,
        marketCap: latest.marketCap,
      })
    }

    // Sort results
    priceChanges.sort((a, b) => {
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
    const dates = priceChanges
      .flatMap((c) => [c.firstDate, c.latestDate])
      .filter(Boolean)
      .sort()

    return NextResponse.json({
      success: true,
      data: {
        companies: priceChanges,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || '',
        },
        total: priceChanges.length,
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
