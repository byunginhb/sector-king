import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql, desc, gte, and, inArray } from 'drizzle-orm'
import type { ApiResponse, MoneyFlowResponse, SectorMoneyFlow, MoneyFlowTrendPoint } from '@/types'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MoneyFlowResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = parseInt(searchParams.get('period') || '14', 10)
    const limit = parseInt(searchParams.get('limit') || '6', 10)

    const db = getDb()

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get available dates in range
    const availableDates = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, startDateStr))
      .orderBy(dailySnapshots.date)

    const dates = availableDates.map((d) => d.date).filter((d): d is string => d !== null)

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
          dateRange: { start: startDateStr, end: startDateStr },
        },
      })
    }

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    // Get all sectors
    const allSectors = await db
      .select({
        id: sectors.id,
        name: sectors.name,
        nameEn: sectors.nameEn,
      })
      .from(sectors)

    // Calculate money flow for each sector
    const sectorFlows: SectorMoneyFlow[] = []

    for (const sector of allSectors) {
      // Get companies in this sector
      const companiesInSector = await db
        .select({ ticker: sectorCompanies.ticker })
        .from(sectorCompanies)
        .where(eq(sectorCompanies.sectorId, sector.id))

      const tickers = companiesInSector
        .map((c) => c.ticker)
        .filter((t): t is string => t !== null)

      if (tickers.length === 0) continue

      // Get snapshots for these companies
      const snapshots = await db
        .select({
          ticker: dailySnapshots.ticker,
          date: dailySnapshots.date,
          marketCap: dailySnapshots.marketCap,
          price: dailySnapshots.price,
          dayHigh: dailySnapshots.dayHigh,
          dayLow: dailySnapshots.dayLow,
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

      // Group by date and calculate sector totals
      const dateMap = new Map<string, { marketCap: number; mfi: number | null }>()

      for (const date of dates) {
        const daySnapshots = snapshots.filter((s) => s.date === date)
        const totalMarketCap = daySnapshots.reduce(
          (sum, s) => sum + (s.marketCap || 0),
          0
        )

        // Calculate MFI if we have high/low data
        let mfi: number | null = null
        const validSnapshots = daySnapshots.filter(
          (s) => s.dayHigh && s.dayLow && s.price && s.volume
        )

        if (validSnapshots.length > 0) {
          // Simplified MFI calculation using current day data
          // Full MFI requires 14-day rolling calculation
          let positiveFlow = 0
          let negativeFlow = 0

          for (const s of validSnapshots) {
            const typicalPrice = ((s.dayHigh || 0) + (s.dayLow || 0) + (s.price || 0)) / 3
            const rawMoneyFlow = typicalPrice * (s.volume || 0)

            // Use price position within day range as proxy for direction
            const range = (s.dayHigh || 0) - (s.dayLow || 0)
            if (range > 0) {
              const position = ((s.price || 0) - (s.dayLow || 0)) / range
              if (position > 0.5) {
                positiveFlow += rawMoneyFlow
              } else {
                negativeFlow += rawMoneyFlow
              }
            }
          }

          if (positiveFlow + negativeFlow > 0) {
            const moneyFlowRatio = negativeFlow > 0 ? positiveFlow / negativeFlow : 100
            mfi = 100 - 100 / (1 + moneyFlowRatio)
          }
        }

        dateMap.set(date, { marketCap: totalMarketCap, mfi })
      }

      // Calculate flow metrics
      const firstData = dateMap.get(firstDate)
      const lastData = dateMap.get(lastDate)

      if (!firstData || !lastData) continue

      const startMarketCap = firstData.marketCap
      const endMarketCap = lastData.marketCap
      const flowAmount = endMarketCap - startMarketCap
      const flowPercent = startMarketCap > 0 ? (flowAmount / startMarketCap) * 100 : 0
      const flowDirection = flowAmount >= 0 ? 'in' : 'out'

      // Build trend data
      const trend: MoneyFlowTrendPoint[] = []
      let prevMarketCap = 0

      for (const date of dates) {
        const data = dateMap.get(date)
        if (data) {
          trend.push({
            date,
            mfi: data.mfi,
            flowAmount: prevMarketCap > 0 ? data.marketCap - prevMarketCap : 0,
            marketCap: data.marketCap,
          })
          prevMarketCap = data.marketCap
        }
      }

      // Use latest MFI or estimate from flow direction
      const latestMfi = lastData.mfi ?? (flowDirection === 'in' ? 55 : 45)

      sectorFlows.push({
        id: sector.id,
        name: sector.name,
        nameEn: sector.nameEn,
        mfi: latestMfi,
        flowDirection,
        flowAmount: Math.abs(flowAmount),
        flowPercent,
        startMarketCap,
        endMarketCap,
        companyCount: tickers.length,
        trend,
      })
    }

    // Sort by absolute flow amount and take top N
    sectorFlows.sort((a, b) => Math.abs(b.flowAmount) - Math.abs(a.flowAmount))
    const topFlows = sectorFlows.slice(0, limit)

    // Calculate totals
    const totalInflow = sectorFlows
      .filter((f) => f.flowDirection === 'in')
      .reduce((sum, f) => sum + f.flowAmount, 0)

    const totalOutflow = sectorFlows
      .filter((f) => f.flowDirection === 'out')
      .reduce((sum, f) => sum + f.flowAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        period,
        date: lastDate,
        flows: topFlows,
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        dateRange: {
          start: firstDate,
          end: lastDate,
        },
      },
    })
  } catch (error) {
    console.error('Money flow API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch money flow data',
      },
      { status: 500 }
    )
  }
}
