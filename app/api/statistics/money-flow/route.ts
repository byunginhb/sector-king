import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { ApiResponse, MoneyFlowResponse } from '@/types'
import { resolveIndustryFilter } from '@/lib/api-helpers'
import {
  getAvailableDates,
  getSectorsWithTickers,
  buildSnapshotIndex,
  calculateSectorFlow,
  calculateTotals,
} from '@/lib/money-flow-helpers'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MoneyFlowResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawPeriod = parseInt(searchParams.get('period') || '14', 10)
    const rawLimit = parseInt(searchParams.get('limit') || '6', 10)
    const period = Number.isNaN(rawPeriod) ? 14 : Math.max(1, Math.min(rawPeriod, 365))
    const limit = Number.isNaN(rawLimit) ? 6 : Math.max(1, Math.min(rawLimit, 50))

    const db = getDb()
    const { filter: industryFilter, errorResponse } = await resolveIndustryFilter(searchParams)
    if (errorResponse) return errorResponse

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    const initialStartDateStr = startDate.toISOString().split('T')[0]

    const { dates, effectiveStartDate } = await getAvailableDates(db, initialStartDateStr)

    if (dates.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          period,
          date: new Date().toISOString().split('T')[0],
          flows: [],
          totalInflow: 0,
          totalOutflow: 0,
          netFlow: 0,
          dateRange: { start: effectiveStartDate, end: effectiveStartDate },
        },
      })
    }

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    const { allSectors, sectorTickerMap, uniqueTickerList } =
      await getSectorsWithTickers(db, industryFilter)

    if (uniqueTickerList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          period,
          date: lastDate,
          flows: [],
          totalInflow: 0,
          totalOutflow: 0,
          netFlow: 0,
          dateRange: { start: firstDate, end: lastDate },
        },
      })
    }

    const snapshotIndex = await buildSnapshotIndex(db, uniqueTickerList, effectiveStartDate)

    // Calculate money flow per sector
    const sectorFlows = allSectors
      .map((sector) => {
        const tickers = sectorTickerMap.get(sector.id) || []
        if (tickers.length === 0) return null
        return calculateSectorFlow(sector, tickers, snapshotIndex, dates, firstDate, lastDate)
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)

    // Sort by absolute flow amount and take top N
    const topFlows = [...sectorFlows]
      .sort((a, b) => Math.abs(b.flowAmount) - Math.abs(a.flowAmount))
      .slice(0, limit)

    const { totalInflow, totalOutflow } = calculateTotals(
      uniqueTickerList,
      snapshotIndex,
      firstDate,
      lastDate
    )

    return NextResponse.json({
      success: true,
      data: {
        period,
        date: lastDate,
        flows: topFlows,
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        dateRange: { start: firstDate, end: lastDate },
      },
    })
  } catch (error) {
    console.error('Money flow API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch money flow data' },
      { status: 500 }
    )
  }
}
