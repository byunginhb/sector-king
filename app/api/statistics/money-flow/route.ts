import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  sectorCompanies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql, desc, gte, and, inArray } from 'drizzle-orm'
import type { ApiResponse, MoneyFlowResponse, SectorMoneyFlow, MoneyFlowTrendPoint } from '@/types'
import { toUsd } from '@/lib/currency'
import { getIndustryFilter } from '@/lib/industry'
import { validateIndustryId } from '@/lib/validate'

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
    const industryId = searchParams.get('industry')

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

    // Get all sectors (filtered by industry if specified)
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

    // Batch query: Get ALL sector-company mappings at once
    const allSectorCompanies = await db
      .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
      .from(sectorCompanies)

    // Group companies by sector in-memory
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

    // Collect all unique tickers across relevant sectors
    const allUniqueTickers = new Set<string>()
    for (const sector of allSectors) {
      const tickers = sectorTickerMap.get(sector.id) || []
      tickers.forEach((t) => allUniqueTickers.add(t))
    }

    const uniqueTickerList = Array.from(allUniqueTickers)

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

    // Batch query: Get ALL snapshots for all relevant tickers in the date range
    const allSnapshots = await db
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
          inArray(dailySnapshots.ticker, uniqueTickerList),
          gte(dailySnapshots.date, startDateStr)
        )
      )
      .orderBy(dailySnapshots.date)

    // Index snapshots by (ticker, date) for O(1) lookup
    type SnapshotData = {
      marketCap: number | null
      price: number | null
      dayHigh: number | null
      dayLow: number | null
      volume: number | null
    }
    const snapshotIndex = new Map<string, SnapshotData>()
    for (const snap of allSnapshots) {
      if (!snap.ticker || !snap.date) continue
      snapshotIndex.set(`${snap.ticker}|${snap.date}`, {
        marketCap: snap.marketCap,
        price: snap.price,
        dayHigh: snap.dayHigh,
        dayLow: snap.dayLow,
        volume: snap.volume,
      })
    }

    // Calculate money flow for each sector using in-memory data
    const sectorFlows: SectorMoneyFlow[] = []

    for (const sector of allSectors) {
      const tickers = sectorTickerMap.get(sector.id) || []
      if (tickers.length === 0) continue

      // Build date map from indexed snapshots
      const dateMap = new Map<string, { marketCap: number; mfi: number | null }>()

      for (const date of dates) {
        let totalMarketCap = 0
        let positiveFlow = 0
        let negativeFlow = 0
        let hasValidMfi = false

        for (const ticker of tickers) {
          const snap = snapshotIndex.get(`${ticker}|${date}`)
          if (!snap) continue

          totalMarketCap += toUsd(snap.marketCap || 0, ticker)

          // Calculate MFI if we have high/low data
          if (snap.dayHigh && snap.dayLow && snap.price && snap.volume) {
            const typicalPrice = (snap.dayHigh + snap.dayLow + snap.price) / 3
            const rawMoneyFlow = toUsd(typicalPrice * snap.volume, ticker)
            const range = snap.dayHigh - snap.dayLow

            if (range > 0) {
              hasValidMfi = true
              const position = (snap.price - snap.dayLow) / range
              if (position > 0.5) {
                positiveFlow += rawMoneyFlow
              } else {
                negativeFlow += rawMoneyFlow
              }
            }
          }
        }

        let mfi: number | null = null
        if (hasValidMfi && positiveFlow + negativeFlow > 0) {
          const moneyFlowRatio = negativeFlow > 0 ? positiveFlow / negativeFlow : 100
          mfi = 100 - 100 / (1 + moneyFlowRatio)
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

      // Average MFI across all dates for more stable indicator
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

    // Sort by absolute flow amount and take top N (immutable)
    const sortedFlows = [...sectorFlows].sort((a, b) => Math.abs(b.flowAmount) - Math.abs(a.flowAmount))
    const topFlows = sortedFlows.slice(0, limit)

    // Calculate totals from unique companies (avoid double-counting across sectors)
    let totalInflow = 0
    let totalOutflow = 0

    if (uniqueTickerList.length > 0) {
      for (const ticker of uniqueTickerList) {
        const startSnap = snapshotIndex.get(`${ticker}|${firstDate}`)
        const endSnap = snapshotIndex.get(`${ticker}|${lastDate}`)
        if (!startSnap || !endSnap) continue

        const startCap = toUsd(startSnap.marketCap || 0, ticker)
        const endCap = toUsd(endSnap.marketCap || 0, ticker)
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
        error: 'Failed to fetch money flow data',
      },
      { status: 500 }
    )
  }
}
