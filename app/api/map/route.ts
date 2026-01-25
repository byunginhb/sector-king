import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  categories,
  sectors,
  sectorCompanies,
  companies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, desc, sql, asc } from 'drizzle-orm'
import type { ApiResponse, MapResponse } from '@/types'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MapResponse>>> {
  try {
    const db = getDb()
    const searchParams = request.nextUrl.searchParams
    const requestedDate = searchParams.get('date')

    // Get all available dates
    const availableDatesResult = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))

    const availableDates = availableDatesResult.map((d) => d.date)

    // Determine which date to use
    const latestDate = availableDates[0] || null
    const selectedDate = requestedDate && availableDates.includes(requestedDate)
      ? requestedDate
      : latestDate
    const isHistorical = selectedDate !== latestDate

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.order)

    const allSectors = await db.select().from(sectors).orderBy(sectors.order)

    // Get sector companies with company info and snapshot for the selected date
    const sectorCompaniesWithDetails = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        ticker: sectorCompanies.ticker,
        rank: sectorCompanies.rank,
        notes: sectorCompanies.notes,
        companyName: companies.name,
        companyNameKo: companies.nameKo,
        logoUrl: companies.logoUrl,
        marketCap: dailySnapshots.marketCap,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
        snapshotDate: dailySnapshots.date,
      })
      .from(sectorCompanies)
      .leftJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .leftJoin(
        dailySnapshots,
        sql`${sectorCompanies.ticker} = ${dailySnapshots.ticker} AND ${dailySnapshots.date} = ${selectedDate}`
      )
      .orderBy(sectorCompanies.sectorId, sectorCompanies.rank)

    // If viewing historical data, also get current prices for comparison
    let currentPricesMap: Map<string, { price: number | null; priceChange: number | null }> = new Map()

    if (isHistorical && latestDate) {
      const currentPrices = await db
        .select({
          ticker: dailySnapshots.ticker,
          price: dailySnapshots.price,
          priceChange: dailySnapshots.priceChange,
        })
        .from(dailySnapshots)
        .where(eq(dailySnapshots.date, latestDate))

      currentPrices.forEach((cp) => {
        if (cp.ticker) {
          currentPricesMap.set(cp.ticker, {
            price: cp.price,
            priceChange: cp.priceChange,
          })
        }
      })
    }

    // Transform data
    const transformedSectorCompanies = sectorCompaniesWithDetails.map((sc) => {
      const currentSnapshot = isHistorical
        ? currentPricesMap.get(sc.ticker ?? '') || null
        : null

      // Calculate price change from snapshot date to now
      let priceChangeFromSnapshot: number | null = null
      if (isHistorical && sc.price && currentSnapshot?.price) {
        priceChangeFromSnapshot = ((currentSnapshot.price - sc.price) / sc.price) * 100
      }

      return {
        sectorId: sc.sectorId ?? '',
        ticker: sc.ticker ?? '',
        rank: sc.rank,
        notes: sc.notes,
        company: {
          ticker: sc.ticker ?? '',
          name: sc.companyName ?? '',
          nameKo: sc.companyNameKo,
          logoUrl: sc.logoUrl,
        },
        snapshot: sc.marketCap
          ? {
              date: sc.snapshotDate ?? selectedDate ?? '',
              marketCap: sc.marketCap,
              price: sc.price,
              priceChange: sc.priceChange,
            }
          : null,
        ...(isHistorical && {
          currentSnapshot,
          priceChangeFromSnapshot,
        }),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        categories: allCategories,
        sectors: allSectors,
        sectorCompanies: transformedSectorCompanies,
        lastUpdated: latestDate,
        selectedDate,
        availableDates,
        isHistorical,
      },
    })
  } catch (error) {
    console.error('Map API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map data' },
      { status: 500 }
    )
  }
}
