import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { companies, dailySnapshots } from '@/drizzle/schema'
import { or, like, desc, eq, sql } from 'drizzle-orm'
import type { ApiResponse, SearchResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('q')?.trim()
    const rawLimit = Number(searchParams.get('limit') || '10')
    const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 30)

    if (!query || query.length < 1) {
      return NextResponse.json<ApiResponse<SearchResponse>>({
        success: true,
        data: { results: [], query: query || '', total: 0 },
      })
    }

    // Input validation
    if (query.length > 100) {
      return NextResponse.json<ApiResponse<SearchResponse>>(
        { success: false, error: '검색어가 너무 깁니다' },
        { status: 400 }
      )
    }

    const db = getDb()
    const pattern = `%${query}%`

    // Get the latest date for snapshots
    const latestDateRow = await db
      .select({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1)

    const latestDate = latestDateRow[0]?.date

    // Search companies with latest snapshot
    const latestSnapshotSubquery = db
      .select({
        ticker: dailySnapshots.ticker,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
        marketCap: dailySnapshots.marketCap,
      })
      .from(dailySnapshots)
      .where(latestDate ? eq(dailySnapshots.date, latestDate) : sql`1=1`)
      .as('latest_snap')

    const results = await db
      .select({
        ticker: companies.ticker,
        name: companies.name,
        nameKo: companies.nameKo,
        price: latestSnapshotSubquery.price,
        priceChange: latestSnapshotSubquery.priceChange,
        marketCap: latestSnapshotSubquery.marketCap,
      })
      .from(companies)
      .leftJoin(
        latestSnapshotSubquery,
        eq(companies.ticker, latestSnapshotSubquery.ticker)
      )
      .where(
        or(
          like(companies.ticker, pattern),
          like(companies.name, pattern),
          like(companies.nameKo, pattern)
        )
      )
      .orderBy(desc(latestSnapshotSubquery.marketCap))
      .limit(limit)

    return NextResponse.json<ApiResponse<SearchResponse>>({
      success: true,
      data: {
        results: results.map((r) => ({
          ticker: r.ticker,
          name: r.name,
          nameKo: r.nameKo,
          price: r.price,
          priceChange: r.priceChange,
          marketCap: r.marketCap,
        })),
        query,
        total: results.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Search API error:', message)
    return NextResponse.json<ApiResponse<SearchResponse>>(
      { success: false, error: '검색 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
