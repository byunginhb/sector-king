import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { desc, inArray } from 'drizzle-orm'
import type { ApiResponse, SectorTrendResponse, SectorTrendData } from '@/types'
import { toUsd } from '@/lib/currency'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'

const TARGET_PERIODS = [1, 3, 7, 14, 30]

export const revalidate = 3600

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SectorTrendResponse>>> {
  try {
    const db = getDb()
    const industryId = request.nextUrl.searchParams.get('industry')

    if (industryId && !validateIndustryId(industryId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid industry ID' },
        { status: 400 }
      )
    }

    const industryFilter = industryId ? await getIndustryFilter(industryId) : null

    if (industryId && !industryFilter) {
      return NextResponse.json(
        { success: false, error: 'Industry not found' },
        { status: 404 }
      )
    }

    // 1. Get all available dates (last 35 days buffer for 30-day period)
    const recentDates = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(40)

    const dates = recentDates
      .map((d) => d.date)
      .filter((d): d is string => d !== null)
      .reverse()

    if (dates.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          sectors: [],
          dateRange: { start: '', end: '' },
        },
      })
    }

    const lastDate = dates[dates.length - 1]

    // 2. Map each target period to its start date (closest available)
    const periodDateMap = new Map<number, string>()
    for (const period of TARGET_PERIODS) {
      const targetIdx = Math.max(0, dates.length - 1 - period)
      periodDateMap.set(period, dates[targetIdx])
    }

    // 3. Collect all unique target dates we need to query
    const targetDatesSet = new Set<string>([lastDate])
    for (const startDate of periodDateMap.values()) {
      targetDatesSet.add(startDate)
    }
    const targetDates = Array.from(targetDatesSet)

    // 4. Get all sectors with their companies (filtered by industry if specified)
    const allSectorsRaw = await db
      .select({
        id: sectors.id,
        name: sectors.name,
        nameEn: sectors.nameEn,
      })
      .from(sectors)

    const allSectors = industryFilter
      ? allSectorsRaw.filter((s) => industryFilter.sectorIds.includes(s.id))
      : allSectorsRaw

    const allSectorCompaniesRaw = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        ticker: sectorCompanies.ticker,
      })
      .from(sectorCompanies)

    const allSectorCompanies = industryFilter
      ? allSectorCompaniesRaw.filter(
          (sc) => sc.sectorId && industryFilter.sectorIds.includes(sc.sectorId)
        )
      : allSectorCompaniesRaw

    // Group companies by sector
    const sectorTickerMap = new Map<string, string[]>()
    for (const sc of allSectorCompanies) {
      if (!sc.sectorId || !sc.ticker) continue
      const existing = sectorTickerMap.get(sc.sectorId)
      if (existing) {
        existing.push(sc.ticker)
      } else {
        sectorTickerMap.set(sc.sectorId, [sc.ticker])
      }
    }

    // 5. Batch query: all snapshots for target dates
    const allSnapshots = await db
      .select({
        ticker: dailySnapshots.ticker,
        date: dailySnapshots.date,
        marketCap: dailySnapshots.marketCap,
      })
      .from(dailySnapshots)
      .where(inArray(dailySnapshots.date, targetDates))

    // Index snapshots by (ticker, date) for O(1) lookup
    const snapshotIndex = new Map<string, number>()
    for (const snap of allSnapshots) {
      if (!snap.ticker || !snap.date) continue
      const key = `${snap.ticker}|${snap.date}`
      snapshotIndex.set(key, toUsd(snap.marketCap || 0, snap.ticker))
    }

    // 6. Calculate per-sector per-period market cap totals
    const sectorTrends: SectorTrendData[] = []

    for (const sector of allSectors) {
      const tickers = sectorTickerMap.get(sector.id)
      if (!tickers || tickers.length === 0) continue

      const periods = TARGET_PERIODS.map((period) => {
        const startDate = periodDateMap.get(period)!

        let startMarketCap = 0
        let endMarketCap = 0

        for (const ticker of tickers) {
          const startCap = snapshotIndex.get(`${ticker}|${startDate}`) ?? 0
          const endCap = snapshotIndex.get(`${ticker}|${lastDate}`) ?? 0
          startMarketCap += startCap
          endMarketCap += endCap
        }

        const flowAmount = endMarketCap - startMarketCap
        const flowPercent = startMarketCap > 0
          ? (flowAmount / startMarketCap) * 100
          : 0

        return {
          period,
          flowPercent: Math.round(flowPercent * 100) / 100,
          flowAmount,
          startMarketCap,
          endMarketCap,
        }
      })

      sectorTrends.push({
        id: sector.id,
        name: sector.name,
        nameEn: sector.nameEn,
        periods,
      })
    }

    // Sort by 30-day flowPercent descending by default
    const sortedTrends = [...sectorTrends].sort((a, b) => {
      const aP30 = a.periods.find((p) => p.period === 30)?.flowPercent ?? 0
      const bP30 = b.periods.find((p) => p.period === 30)?.flowPercent ?? 0
      return bP30 - aP30
    })

    return NextResponse.json({
      success: true,
      data: {
        sectors: sortedTrends,
        dateRange: { start: dates[0], end: lastDate },
      },
    })
  } catch (error) {
    console.error('Sector trend API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sector trend data',
      },
      { status: 500 }
    )
  }
}
