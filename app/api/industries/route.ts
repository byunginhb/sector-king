import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  industries,
  industryCategories,
  sectors,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, inArray, desc } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import type { ApiResponse, IndustriesResponse, IndustryOverview } from '@/types'

export const revalidate = 3600

export async function GET(): Promise<NextResponse<ApiResponse<IndustriesResponse>>> {
  try {
    const db = getDb()

    // Get all industries
    const allIndustries = await db
      .select()
      .from(industries)
      .orderBy(industries.order)

    // Get latest date
    const latestDateResult = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(2)

    const dates = latestDateResult.map((d) => d.date).filter((d): d is string => d !== null)
    const latestDate = dates[0] ?? null
    const prevDate = dates[1] ?? null

    // Get all industry-category mappings
    const allIC = await db
      .select({
        industryId: industryCategories.industryId,
        categoryId: industryCategories.categoryId,
      })
      .from(industryCategories)

    // Get all sectors
    const allSectors = await db
      .select({ id: sectors.id, categoryId: sectors.categoryId })
      .from(sectors)

    // Get all sector-companies
    const allSC = await db
      .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
      .from(sectorCompanies)

    // Get snapshots for latest and previous dates
    const targetDates = [latestDate, prevDate].filter((d): d is string => d !== null)
    const allSnapshots = targetDates.length > 0
      ? await db
          .select({
            ticker: dailySnapshots.ticker,
            date: dailySnapshots.date,
            marketCap: dailySnapshots.marketCap,
          })
          .from(dailySnapshots)
          .where(inArray(dailySnapshots.date, targetDates))
      : []

    // Build snapshot index
    const snapshotIndex = new Map<string, number>()
    for (const snap of allSnapshots) {
      if (!snap.ticker || !snap.date) continue
      snapshotIndex.set(`${snap.ticker}|${snap.date}`, toUsd(snap.marketCap || 0, snap.ticker))
    }

    // Build industry overviews
    const industryOverviews: IndustryOverview[] = allIndustries.map((ind) => {
      // Get categories for this industry
      const categoryIds = allIC
        .filter((ic) => ic.industryId === ind.id)
        .map((ic) => ic.categoryId)
        .filter((id): id is string => id !== null)

      // Get sectors for those categories
      const sectorIds = allSectors
        .filter((s) => s.categoryId && categoryIds.includes(s.categoryId))
        .map((s) => s.id)

      // Get unique tickers
      const tickerSet = new Set<string>()
      for (const sc of allSC) {
        if (sc.sectorId && sectorIds.includes(sc.sectorId) && sc.ticker) {
          tickerSet.add(sc.ticker)
        }
      }

      // Calculate market cap
      let totalMarketCap = 0
      let prevTotalMarketCap = 0
      for (const ticker of tickerSet) {
        if (latestDate) {
          totalMarketCap += snapshotIndex.get(`${ticker}|${latestDate}`) ?? 0
        }
        if (prevDate) {
          prevTotalMarketCap += snapshotIndex.get(`${ticker}|${prevDate}`) ?? 0
        }
      }

      const marketCapChange = prevTotalMarketCap > 0
        ? ((totalMarketCap - prevTotalMarketCap) / prevTotalMarketCap) * 100
        : 0

      return {
        id: ind.id,
        name: ind.name,
        nameEn: ind.nameEn,
        icon: ind.icon,
        categoryCount: categoryIds.length,
        sectorCount: sectorIds.length,
        companyCount: tickerSet.size,
        totalMarketCap,
        marketCapChange: Math.round(marketCapChange * 100) / 100,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        industries: industryOverviews,
        lastUpdated: latestDate,
      },
    })
  } catch (error) {
    console.error('Industries API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch industries data' },
      { status: 500 }
    )
  }
}
