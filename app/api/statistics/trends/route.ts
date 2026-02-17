import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dailySnapshots } from '@/drizzle/schema'
import { gte } from 'drizzle-orm'
import type { ApiResponse, TrendResponse, CategoryMarketCap, SectorGrowth } from '@/types'
import { resolveIndustryFilter } from '@/lib/api-helpers'
import {
  getSectorTrends,
  getCategoryTrends,
  getCompanyTrends,
  getCategoryMarketCaps,
  getSectorGrowth,
} from '@/lib/trends-helpers'

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

    const db = getDb()
    const { filter: industryFilter, errorResponse } = await resolveIndustryFilter(searchParams)
    if (errorResponse) return errorResponse

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
        data: { items: [], dateRange: { start: startDateStr, end: startDateStr } },
      })
    }

    const dateRange = { start: dates[0], end: dates[dates.length - 1] }

    if (type === 'sector') {
      const [items, sectorGrowth] = await Promise.all([
        getSectorTrends(db, ids, dates, industryFilter),
        getSectorGrowth(db, dates, industryFilter),
      ])
      return NextResponse.json({ success: true, data: { items, dateRange, sectorGrowth } })
    }

    if (type === 'category') {
      const [items, categoryMarketCaps] = await Promise.all([
        getCategoryTrends(db, ids, dates, industryFilter),
        getCategoryMarketCaps(db, dates[dates.length - 1], industryFilter),
      ])
      return NextResponse.json({ success: true, data: { items, dateRange, categories: categoryMarketCaps } })
    }

    if (type === 'company') {
      const items = await getCompanyTrends(db, ids, dates, industryFilter)
      return NextResponse.json({ success: true, data: { items, dateRange } })
    }

    return NextResponse.json({ success: true, data: { items: [], dateRange } })
  } catch (error) {
    console.error('Statistics Trends API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    )
  }
}
