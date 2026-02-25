import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { industries, industryCategories, sectors, sectorCompanies } from '@/drizzle/schema'
import { toUsd } from '@/lib/currency'
import { getAvailableDates, buildSnapshotIndex } from '@/lib/money-flow-helpers'
import type { ApiResponse, IndustryMoneyFlowResponse, IndustryMoneyFlowSummary } from '@/types'

export const revalidate = 3600

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<IndustryMoneyFlowResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawPeriod = parseInt(searchParams.get('period') || '14', 10)
    const period = Number.isNaN(rawPeriod) ? 14 : Math.max(1, Math.min(rawPeriod, 365))

    const db = getDb()

    // 1. Load all industries
    const allIndustries = await db
      .select()
      .from(industries)
      .orderBy(industries.order)

    if (allIndustries.length === 0) {
      return NextResponse.json({
        success: true,
        data: { industries: [], period, dateRange: { start: '', end: '' } },
      })
    }

    // 2. Load all industry-category mappings at once
    const allIcRows = await db
      .select({
        industryId: industryCategories.industryId,
        categoryId: industryCategories.categoryId,
      })
      .from(industryCategories)

    const industryCategoryMap = new Map<string, string[]>()
    for (const row of allIcRows) {
      if (!row.industryId || !row.categoryId) continue
      const existing = industryCategoryMap.get(row.industryId)
      if (existing) {
        existing.push(row.categoryId)
      } else {
        industryCategoryMap.set(row.industryId, [row.categoryId])
      }
    }

    // 3. Load all sectors at once
    const allSectors = await db
      .select({ id: sectors.id, categoryId: sectors.categoryId })
      .from(sectors)

    const categorySectorMap = new Map<string, string[]>()
    for (const s of allSectors) {
      if (!s.categoryId) continue
      const existing = categorySectorMap.get(s.categoryId)
      if (existing) {
        existing.push(s.id)
      } else {
        categorySectorMap.set(s.categoryId, [s.id])
      }
    }

    // 4. Load all sector-company mappings at once
    const allScRows = await db
      .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
      .from(sectorCompanies)

    const sectorTickerMap = new Map<string, string[]>()
    for (const row of allScRows) {
      if (!row.sectorId || !row.ticker) continue
      const existing = sectorTickerMap.get(row.sectorId)
      if (existing) {
        existing.push(row.ticker)
      } else {
        sectorTickerMap.set(row.sectorId, [row.ticker])
      }
    }

    // 5. Build per-industry ticker lists
    const industryTickerMap = new Map<string, Set<string>>()
    const globalTickerSet = new Set<string>()

    for (const ind of allIndustries) {
      const categoryIds = industryCategoryMap.get(ind.id) || []
      const tickerSet = new Set<string>()
      for (const catId of categoryIds) {
        const sectorIds = categorySectorMap.get(catId) || []
        for (const secId of sectorIds) {
          const tickers = sectorTickerMap.get(secId) || []
          for (const t of tickers) {
            tickerSet.add(t)
            globalTickerSet.add(t)
          }
        }
      }
      industryTickerMap.set(ind.id, tickerSet)
    }

    // 6. Calculate date range and build snapshot index once
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    const initialStartDateStr = startDate.toISOString().split('T')[0]

    const { dates, effectiveStartDate } = await getAvailableDates(db, initialStartDateStr)

    if (dates.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          industries: [],
          period,
          dateRange: { start: effectiveStartDate, end: effectiveStartDate },
        },
      })
    }

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    const globalTickers = Array.from(globalTickerSet)
    if (globalTickers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          industries: [],
          period,
          dateRange: { start: firstDate, end: lastDate },
        },
      })
    }

    const snapshotIndex = await buildSnapshotIndex(db, globalTickers, effectiveStartDate)

    // 7. Calculate totals per industry
    const results: IndustryMoneyFlowSummary[] = []

    for (const ind of allIndustries) {
      const tickerSet = industryTickerMap.get(ind.id)
      if (!tickerSet || tickerSet.size === 0) continue

      let totalInflow = 0
      let totalOutflow = 0

      for (const ticker of tickerSet) {
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

      const netFlow = totalInflow - totalOutflow
      const totalBase = totalInflow + totalOutflow
      const netFlowPercent = totalBase > 0 ? (netFlow / totalBase) * 100 : 0

      results.push({
        industryId: ind.id,
        industryName: ind.name,
        industryNameEn: ind.nameEn,
        industryIcon: ind.icon,
        totalInflow,
        totalOutflow,
        netFlow,
        netFlowPercent,
        flowDirection: netFlow >= 0 ? 'in' : 'out',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        industries: results,
        period,
        dateRange: { start: firstDate, end: lastDate },
      },
    })
  } catch (error) {
    console.error('Industry money flow API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch industry money flow data' },
      { status: 500 }
    )
  }
}
