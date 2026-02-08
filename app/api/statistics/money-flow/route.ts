import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql, desc, gte, and, inArray } from 'drizzle-orm'
import type { ApiResponse, MoneyFlowResponse, SectorMoneyFlow, MoneyFlowTrendPoint } from '@/types'

// KRW → USD exchange rate (configurable via env)
const KRW_USD_RATE = Number(process.env.KRW_USD_RATE) || 1450

function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

function toUsd(value: number, ticker: string): number {
  return isKoreanTicker(ticker) ? value / KRW_USD_RATE : value
}

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

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    let startDateStr = startDate.toISOString().split('T')[0]

    // Get available dates in range
    const availableDates = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, startDateStr))
      .orderBy(dailySnapshots.date)

    let dates = availableDates.map((d) => d.date).filter((d): d is string => d !== null)

    // For short periods (e.g. 1 day) or sparse data, fall back to last 2 available dates
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
    const allUniqueTickers = new Set<string>()

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
      tickers.forEach((t) => allUniqueTickers.add(t))

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
          (sum, s) => sum + toUsd(s.marketCap || 0, s.ticker ?? ''),
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
            const rawMoneyFlow = toUsd(typicalPrice * (s.volume || 0), s.ticker ?? '')

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

      // Average MFI across all dates for more stable indicator than single-day snapshot
      const mfiValues = Array.from(dateMap.values())
        .map((d) => d.mfi)
        .filter((m): m is number => m !== null)
      const periodMfi = mfiValues.length > 0
        ? mfiValues.reduce((sum, m) => sum + m, 0) / mfiValues.length
        : null

      sectorFlows.push({
        id: sector.id,
        name: sector.name,
        nameEn: sector.nameEn,
        mfi: periodMfi,
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

    // Calculate totals from unique companies (avoid double-counting across sectors)
    const uniqueTickerList = Array.from(allUniqueTickers)
    let totalInflow = 0
    let totalOutflow = 0

    if (uniqueTickerList.length > 0) {
      const [startSnaps, endSnaps] = await Promise.all([
        db
          .select({
            ticker: dailySnapshots.ticker,
            marketCap: dailySnapshots.marketCap,
          })
          .from(dailySnapshots)
          .where(
            and(
              inArray(dailySnapshots.ticker, uniqueTickerList),
              eq(dailySnapshots.date, firstDate)
            )
          ),
        db
          .select({
            ticker: dailySnapshots.ticker,
            marketCap: dailySnapshots.marketCap,
          })
          .from(dailySnapshots)
          .where(
            and(
              inArray(dailySnapshots.ticker, uniqueTickerList),
              eq(dailySnapshots.date, lastDate)
            )
          ),
      ])

      const startMap = new Map(
        startSnaps.map((s) => [s.ticker, toUsd(s.marketCap || 0, s.ticker ?? '')])
      )
      const endMap = new Map(
        endSnaps.map((s) => [s.ticker, toUsd(s.marketCap || 0, s.ticker ?? '')])
      )

      for (const ticker of uniqueTickerList) {
        const startCap = startMap.get(ticker)
        const endCap = endMap.get(ticker)
        if (startCap === undefined || endCap === undefined) continue
        if (startCap === 0 && endCap === 0) continue
        const change = endCap - startCap
        if (change > 0) {
          totalInflow += change
        } else {
          totalOutflow += Math.abs(change)
        }
      }
    }

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
