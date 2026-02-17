import { getDb } from '@/lib/db'
import { sectors, sectorCompanies, dailySnapshots } from '@/drizzle/schema'
import { desc, gte, and, inArray } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import type { SectorMoneyFlow, MoneyFlowTrendPoint, IndustryFilterResult } from '@/types'

export type SnapshotData = {
  marketCap: number | null
  price: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
}

export type SectorInfo = { id: string; name: string; nameEn: string | null }

/**
 * Get available dates in the given range, with fallback to last 2 dates for sparse data.
 */
export async function getAvailableDates(
  db: ReturnType<typeof getDb>,
  startDateStr: string
): Promise<{ dates: string[]; effectiveStartDate: string }> {
  const availableDates = await db
    .selectDistinct({ date: dailySnapshots.date })
    .from(dailySnapshots)
    .where(gte(dailySnapshots.date, startDateStr))
    .orderBy(dailySnapshots.date)

  let dates = availableDates.map((d) => d.date).filter((d): d is string => d !== null)
  let effectiveStartDate = startDateStr

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
      effectiveStartDate = dates[0]
    }
  }

  return { dates, effectiveStartDate }
}

/**
 * Get sectors and their tickers, optionally filtered by industry.
 */
export async function getSectorsWithTickers(
  db: ReturnType<typeof getDb>,
  industryFilter: IndustryFilterResult | null
): Promise<{ allSectors: SectorInfo[]; sectorTickerMap: Map<string, string[]>; uniqueTickerList: string[] }> {
  const allSectorsRaw = await db
    .select({ id: sectors.id, name: sectors.name, nameEn: sectors.nameEn })
    .from(sectors)

  const allSectors = industryFilter
    ? allSectorsRaw.filter((s) => industryFilter.sectorIds.includes(s.id))
    : allSectorsRaw

  const allSectorCompanies = await db
    .select({ sectorId: sectorCompanies.sectorId, ticker: sectorCompanies.ticker })
    .from(sectorCompanies)

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

  const allUniqueTickers = new Set<string>()
  for (const sector of allSectors) {
    const tickers = sectorTickerMap.get(sector.id) || []
    for (const t of tickers) allUniqueTickers.add(t)
  }

  return { allSectors, sectorTickerMap, uniqueTickerList: Array.from(allUniqueTickers) }
}

/**
 * Build snapshot index by (ticker|date) key for O(1) lookup.
 */
export async function buildSnapshotIndex(
  db: ReturnType<typeof getDb>,
  tickerList: string[],
  startDateStr: string
): Promise<Map<string, SnapshotData>> {
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
        inArray(dailySnapshots.ticker, tickerList),
        gte(dailySnapshots.date, startDateStr)
      )
    )
    .orderBy(dailySnapshots.date)

  const index = new Map<string, SnapshotData>()
  for (const snap of allSnapshots) {
    if (!snap.ticker || !snap.date) continue
    index.set(`${snap.ticker}|${snap.date}`, {
      marketCap: snap.marketCap,
      price: snap.price,
      dayHigh: snap.dayHigh,
      dayLow: snap.dayLow,
      volume: snap.volume,
    })
  }
  return index
}

/**
 * Calculate money flow metrics for a single sector.
 */
export function calculateSectorFlow(
  sector: SectorInfo,
  tickers: string[],
  snapshotIndex: Map<string, SnapshotData>,
  dates: string[],
  firstDate: string,
  lastDate: string
): SectorMoneyFlow | null {
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

  const firstData = dateMap.get(firstDate)
  const lastData = dateMap.get(lastDate)
  if (!firstData || !lastData) return null

  const startMarketCap = firstData.marketCap
  const endMarketCap = lastData.marketCap
  const flowAmount = endMarketCap - startMarketCap

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

  // Average MFI across all dates
  const mfiValues = Array.from(dateMap.values())
    .map((d) => d.mfi)
    .filter((m): m is number => m !== null)
  const periodMfi = mfiValues.length > 0
    ? mfiValues.reduce((sum, m) => sum + m, 0) / mfiValues.length
    : null

  return {
    id: sector.id,
    name: sector.name,
    nameEn: sector.nameEn,
    mfi: periodMfi,
    flowDirection: flowAmount >= 0 ? 'in' : 'out',
    flowAmount: Math.abs(flowAmount),
    flowPercent: startMarketCap > 0 ? (flowAmount / startMarketCap) * 100 : 0,
    startMarketCap,
    endMarketCap,
    companyCount: tickers.length,
    trend,
  }
}

/**
 * Calculate total inflow/outflow from unique companies (avoids double-counting).
 */
export function calculateTotals(
  uniqueTickerList: string[],
  snapshotIndex: Map<string, SnapshotData>,
  firstDate: string,
  lastDate: string
): { totalInflow: number; totalOutflow: number } {
  let totalInflow = 0
  let totalOutflow = 0

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

  return { totalInflow, totalOutflow }
}
