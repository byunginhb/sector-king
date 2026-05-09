import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  industries,
  industryCategories,
  sectors,
  sectorCompanies,
  companies,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, inArray, desc, gte } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { resolveRegion, regionFilterToValue } from '@/lib/region'
import type { ApiResponse, IndustriesResponse, IndustryOverview } from '@/types'

export const revalidate = 3600

const HISTORY_DAYS = 14

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<IndustriesResponse>>> {
  try {
    const db = getDb()
    const region = resolveRegion(request.nextUrl.searchParams)
    const regionValue = regionFilterToValue(region)

    // Get all industries
    const allIndustries = await db
      .select()
      .from(industries)
      .orderBy(industries.order)

    // Get distinct dates (descending) — 최대 HISTORY_DAYS+여유
    const distinctDateRows = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(HISTORY_DAYS + 2)

    const allDates = distinctDateRows.map((d) => d.date).filter((d): d is string => d !== null)
    const latestDate = allDates[0] ?? null
    const prevDate = allDates[1] ?? null
    // history: 오래된 순으로 정렬
    const historyDates = [...allDates].slice(0, HISTORY_DAYS).sort()
    const oldestHistoryDate = historyDates[0] ?? null

    // Get all industry-category mappings
    const allIC = await db
      .select({
        industryId: industryCategories.industryId,
        categoryId: industryCategories.categoryId,
      })
      .from(industryCategories)

    // Get all sectors (id, categoryId, name)
    const allSectors = await db
      .select({
        id: sectors.id,
        categoryId: sectors.categoryId,
        name: sectors.name,
      })
      .from(sectors)

    // Get all sector-companies (region 적용 시 SQL 단계 join)
    const allSC = regionValue
      ? await db
          .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
          .from(sectorCompanies)
          .innerJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
          .where(eq(companies.region, regionValue))
      : await db
          .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
          .from(sectorCompanies)

    // Get snapshots for the history window
    const allSnapshots = oldestHistoryDate
      ? await db
          .select({
            ticker: dailySnapshots.ticker,
            date: dailySnapshots.date,
            marketCap: dailySnapshots.marketCap,
          })
          .from(dailySnapshots)
          .where(gte(dailySnapshots.date, oldestHistoryDate))
      : []

    // ticker → date → mcap (USD) index
    const snapshotIndex = new Map<string, Map<string, number>>()
    for (const snap of allSnapshots) {
      if (!snap.ticker || !snap.date) continue
      const v = toUsd(snap.marketCap || 0, snap.ticker)
      let inner = snapshotIndex.get(snap.ticker)
      if (!inner) {
        inner = new Map<string, number>()
        snapshotIndex.set(snap.ticker, inner)
      }
      inner.set(snap.date, v)
    }

    // companies (ticker → name/nameKo) — 후순위 필요 컬럼만
    const allCompanies = regionValue
      ? await db
          .select({
            ticker: companies.ticker,
            name: companies.name,
            nameKo: companies.nameKo,
          })
          .from(companies)
          .where(eq(companies.region, regionValue))
      : await db
          .select({
            ticker: companies.ticker,
            name: companies.name,
            nameKo: companies.nameKo,
          })
          .from(companies)
    const companyByTicker = new Map(allCompanies.map((c) => [c.ticker, c]))

    // Build industry overviews
    const industryOverviews: IndustryOverview[] = allIndustries.map((ind) => {
      // Get categories for this industry
      const categoryIds = allIC
        .filter((ic) => ic.industryId === ind.id)
        .map((ic) => ic.categoryId)
        .filter((id): id is string => id !== null)

      // Get sectors for those categories
      const indSectors = allSectors.filter(
        (s) => s.categoryId && categoryIds.includes(s.categoryId)
      )
      const sectorIds = indSectors.map((s) => s.id)

      // sectorId → tickers
      const sectorToTickers = new Map<string, string[]>()
      const tickerSet = new Set<string>()
      for (const sc of allSC) {
        if (sc.sectorId && sectorIds.includes(sc.sectorId) && sc.ticker) {
          tickerSet.add(sc.ticker)
          const arr = sectorToTickers.get(sc.sectorId) ?? []
          arr.push(sc.ticker)
          sectorToTickers.set(sc.sectorId, arr)
        }
      }

      // Calculate market cap for latest / prev
      let totalMarketCap = 0
      let prevTotalMarketCap = 0
      for (const ticker of tickerSet) {
        const inner = snapshotIndex.get(ticker)
        if (!inner) continue
        if (latestDate) totalMarketCap += inner.get(latestDate) ?? 0
        if (prevDate) prevTotalMarketCap += inner.get(prevDate) ?? 0
      }

      const marketCapChange =
        prevTotalMarketCap > 0
          ? ((totalMarketCap - prevTotalMarketCap) / prevTotalMarketCap) * 100
          : 0

      // 14일 시계열 (산업 시총 = 해당일 산업 보유 ticker들의 USD mcap 합계)
      const marketCapHistory = historyDates.map((d) => {
        let sum = 0
        for (const ticker of tickerSet) {
          const inner = snapshotIndex.get(ticker)
          if (!inner) continue
          sum += inner.get(d) ?? 0
        }
        return sum
      })

      // 핫 섹터: 14일 자금 유입(첫 → 마지막 시총 변화)이 가장 큰 섹터
      let topSectorByFlow: IndustryOverview['topSectorByFlow'] = null
      const firstDate = historyDates[0] ?? null
      const lastDate = historyDates[historyDates.length - 1] ?? null
      if (firstDate && lastDate && firstDate !== lastDate) {
        let bestFlow = -Infinity
        for (const sec of indSectors) {
          const tickers = sectorToTickers.get(sec.id) ?? []
          let firstSum = 0
          let lastSum = 0
          for (const t of tickers) {
            const inner = snapshotIndex.get(t)
            if (!inner) continue
            firstSum += inner.get(firstDate) ?? 0
            lastSum += inner.get(lastDate) ?? 0
          }
          const flow = lastSum - firstSum
          if (flow > bestFlow) {
            bestFlow = flow
            topSectorByFlow = { id: sec.id, name: sec.name, flowAmount: flow }
          }
        }
      }

      // 등락 1위 회사: 14일 시총 변화율이 가장 큰 ticker
      let topCompanyByChange: IndustryOverview['topCompanyByChange'] = null
      if (firstDate && lastDate && firstDate !== lastDate) {
        let bestChange = -Infinity
        for (const ticker of tickerSet) {
          const inner = snapshotIndex.get(ticker)
          if (!inner) continue
          const a = inner.get(firstDate) ?? 0
          const b = inner.get(lastDate) ?? 0
          if (a <= 0) continue
          const ch = ((b - a) / a) * 100
          if (ch > bestChange) {
            bestChange = ch
            const c = companyByTicker.get(ticker)
            topCompanyByChange = {
              ticker,
              name: c?.name ?? ticker,
              nameKo: c?.nameKo ?? null,
              changePercent: Math.round(ch * 100) / 100,
            }
          }
        }
      }

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
        marketCapHistory,
        topSectorByFlow,
        topCompanyByChange,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        industries: industryOverviews,
        lastUpdated: latestDate,
        appliedRegion: region,
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
