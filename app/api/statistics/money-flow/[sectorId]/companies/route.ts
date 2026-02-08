import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  sectorCompanies,
  companies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, and, gte, inArray, desc } from 'drizzle-orm'
import type {
  ApiResponse,
  SectorCompaniesResponse,
  SectorCompanyPriceData,
} from '@/types'

const KRW_USD_RATE = Number(process.env.KRW_USD_RATE) || 1450

function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

function toUsd(value: number, ticker: string): number {
  return isKoreanTicker(ticker) ? value / KRW_USD_RATE : value
}

export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string }> }
): Promise<NextResponse<ApiResponse<SectorCompaniesResponse>>> {
  try {
    const { sectorId } = await params

    if (!sectorId || typeof sectorId !== 'string' || sectorId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid sector ID' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const rawPeriod = parseInt(searchParams.get('period') || '14', 10)
    const period = Number.isNaN(rawPeriod)
      ? 14
      : Math.max(1, Math.min(rawPeriod, 365))

    const db = getDb()

    // Verify sector exists
    const [sector] = await db
      .select({ id: sectors.id, name: sectors.name })
      .from(sectors)
      .where(eq(sectors.id, sectorId))
      .limit(1)

    if (!sector) {
      return NextResponse.json(
        { success: false, error: 'Sector not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    let startDateStr = startDate.toISOString().split('T')[0]

    // Get available dates in range
    const availableDates = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, startDateStr))
      .orderBy(dailySnapshots.date)

    let dates = availableDates
      .map((d) => d.date)
      .filter((d): d is string => d !== null)

    // Fallback for sparse data
    if (dates.length < 2) {
      const recentDates = await db
        .selectDistinct({ date: dailySnapshots.date })
        .from(dailySnapshots)
        .orderBy(desc(dailySnapshots.date))
        .limit(2)
      dates = recentDates
        .map((d) => d.date)
        .filter((d): d is string => d !== null)
        .reverse()
      if (dates.length >= 1) {
        startDateStr = dates[0]
      }
    }

    if (dates.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          sectorId,
          sectorName: sector.name,
          period,
          dateRange: { start: startDateStr, end: startDateStr },
          companies: [],
        },
      })
    }

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    // Get companies in this sector with details
    const companiesInSector = await db
      .select({
        ticker: sectorCompanies.ticker,
        rank: sectorCompanies.rank,
        name: companies.name,
        nameKo: companies.nameKo,
      })
      .from(sectorCompanies)
      .innerJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .where(eq(sectorCompanies.sectorId, sectorId))

    const tickers = companiesInSector
      .map((c) => c.ticker)
      .filter((t): t is string => t !== null)

    if (tickers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sectorId,
          sectorName: sector.name,
          period,
          dateRange: { start: firstDate, end: lastDate },
          companies: [],
        },
      })
    }

    // Fetch all snapshots in date range for these tickers
    const snapshots = await db
      .select({
        ticker: dailySnapshots.ticker,
        date: dailySnapshots.date,
        price: dailySnapshots.price,
        marketCap: dailySnapshots.marketCap,
        volume: dailySnapshots.volume,
      })
      .from(dailySnapshots)
      .where(
        and(
          inArray(dailySnapshots.ticker, tickers),
          gte(dailySnapshots.date, startDateStr)
        )
      )
      .orderBy(dailySnapshots.date)

    // Group snapshots by ticker
    const snapshotsByTicker = new Map<
      string,
      { date: string; price: number | null; marketCap: number | null; volume: number | null }[]
    >()
    for (const snap of snapshots) {
      const ticker = snap.ticker ?? ''
      if (!snapshotsByTicker.has(ticker)) {
        snapshotsByTicker.set(ticker, [])
      }
      snapshotsByTicker.get(ticker)!.push({
        date: snap.date,
        price: snap.price,
        marketCap: snap.marketCap,
        volume: snap.volume,
      })
    }

    // Build company data
    const result: SectorCompanyPriceData[] = companiesInSector.map((comp) => {
      const ticker = comp.ticker ?? ''
      const tickerSnapshots = snapshotsByTicker.get(ticker) || []

      const firstSnap = tickerSnapshots.find((s) => s.date === firstDate)
      const lastSnap = tickerSnapshots.find((s) => s.date === lastDate)

      const startPrice = firstSnap?.price
        ? toUsd(firstSnap.price, ticker)
        : null
      const endPrice = lastSnap?.price ? toUsd(lastSnap.price, ticker) : null

      const priceChangePercent =
        startPrice && endPrice
          ? ((endPrice - startPrice) / startPrice) * 100
          : null

      const marketCap = lastSnap?.marketCap
        ? toUsd(lastSnap.marketCap, ticker)
        : null

      const priceHistory = tickerSnapshots.map((s) => ({
        date: s.date,
        price: s.price ? toUsd(s.price, ticker) : 0,
        volume: s.volume ?? 0,
      }))

      return {
        ticker,
        name: comp.name,
        nameKo: comp.nameKo,
        rank: comp.rank,
        startPrice,
        endPrice,
        priceChangePercent,
        marketCap,
        priceHistory,
      }
    })

    // Sort by |priceChangePercent| descending (immutable)
    const sorted = [...result].sort((a, b) => {
      const aAbs = Math.abs(a.priceChangePercent ?? 0)
      const bAbs = Math.abs(b.priceChangePercent ?? 0)
      return bAbs - aAbs
    })

    return NextResponse.json({
      success: true,
      data: {
        sectorId,
        sectorName: sector.name,
        period,
        dateRange: { start: firstDate, end: lastDate },
        companies: sorted,
      },
    })
  } catch (error) {
    console.error('Sector companies API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sector companies',
      },
      { status: 500 }
    )
  }
}
