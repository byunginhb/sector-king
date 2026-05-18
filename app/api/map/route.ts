import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  categories,
  sectors,
  sectorCompanies,
  companies,
  dailySnapshots,
  companyScores,
} from '@/drizzle/schema'
import { eq, desc, sql } from 'drizzle-orm'
import type { ApiResponse, MapResponse } from '@/types'
import { resolveIndustryFilter } from '@/lib/api-helpers'
import { applyRegionFilter, matchesRegion } from '@/lib/region'
import { toScoreSummary } from '@/lib/format'
import { toUsd } from '@/lib/currency'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MapResponse>>> {
  try {
    const db = getDb()
    const searchParams = request.nextUrl.searchParams
    const requestedDate = searchParams.get('date')

    // Resolve industry & region filters (validates + looks up)
    const { filter: industryFilter, region, errorResponse } = await resolveIndustryFilter(searchParams)
    if (errorResponse) return errorResponse

    // industry 미지정 + region 지정 케이스를 위해 사전 ticker 풀 계산
    // (industry 지정 케이스는 industryFilter.tickers 에서 합성)
    const tickerWhitelist = industryFilter
      ? new Set(applyRegionFilter(industryFilter.tickers, region))
      : null

    // Get available dates (last 365 days max)
    const availableDatesResult = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(365)

    const availableDates = availableDatesResult
      .map((d) => d.date)
      .filter((d): d is string => d !== null)

    // Determine which date to use
    const latestDate = availableDates[0] || null
    const selectedDate = requestedDate && availableDates.includes(requestedDate)
      ? requestedDate
      : latestDate
    const isHistorical = selectedDate !== latestDate

    // Get categories (filtered by industry if specified)
    const allCategoriesRaw = await db
      .select()
      .from(categories)
      .orderBy(categories.order)

    const allCategories = industryFilter
      ? allCategoriesRaw.filter((c) => industryFilter.categoryIds.includes(c.id))
      : allCategoriesRaw

    // Get sectors (filtered by industry if specified)
    const allSectorsRaw = await db.select().from(sectors).orderBy(sectors.order)

    const allSectors = industryFilter
      ? allSectorsRaw.filter((s) => industryFilter.sectorIds.includes(s.id))
      : allSectorsRaw

    // Get sector companies with company info, snapshot, and scores
    const sectorCompaniesWithDetails = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        ticker: sectorCompanies.ticker,
        rank: sectorCompanies.rank,
        notes: sectorCompanies.notes,
        companyName: companies.name,
        companyNameKo: companies.nameKo,
        logoUrl: companies.logoUrl,
        marketCap: dailySnapshots.marketCap,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
        snapshotDate: dailySnapshots.date,
        smoothedScore: companyScores.smoothedScore,
        scaleScore: companyScores.scaleScore,
        growthScore: companyScores.growthScore,
        profitabilityScore: companyScores.profitabilityScore,
        sentimentScore: companyScores.sentimentScore,
        dataQuality: companyScores.dataQuality,
      })
      .from(sectorCompanies)
      .leftJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .leftJoin(
        dailySnapshots,
        sql`${sectorCompanies.ticker} = ${dailySnapshots.ticker} AND ${dailySnapshots.date} = ${selectedDate}`
      )
      .leftJoin(companyScores, eq(sectorCompanies.ticker, companyScores.ticker))
      .orderBy(sectorCompanies.sectorId, sectorCompanies.rank)

    // If viewing historical data, also get current prices for comparison
    const currentPricesMap = new Map<string, { price: number | null; priceChange: number | null }>()

    if (isHistorical && latestDate) {
      const currentPrices = await db
        .select({
          ticker: dailySnapshots.ticker,
          price: dailySnapshots.price,
          priceChange: dailySnapshots.priceChange,
        })
        .from(dailySnapshots)
        .where(eq(dailySnapshots.date, latestDate))

      for (const cp of currentPrices) {
        if (cp.ticker) {
          // price 는 USD 정규화 (priceChange 는 % — 변환 불필요)
          currentPricesMap.set(cp.ticker, {
            price: cp.price != null ? toUsd(cp.price, cp.ticker) : null,
            priceChange: cp.priceChange,
          })
        }
      }
    }

    // Filter sectorCompanies by industry & region
    const filteredSCWithDetails = sectorCompaniesWithDetails.filter((sc) => {
      if (industryFilter && !industryFilter.sectorIds.includes(sc.sectorId ?? '')) {
        return false
      }
      if (tickerWhitelist && !tickerWhitelist.has(sc.ticker ?? '')) {
        return false
      }
      // industry 미지정 케이스: ticker 단위 region 필터 (접미사 기반 — SoT lib/region.ts)
      if (!industryFilter && region !== 'all') {
        if (!matchesRegion(sc.ticker ?? '', region)) return false
      }
      return true
    })

    // Transform data — price·marketCap 은 USD 정규화 (priceChange 는 % — 변환 불필요)
    const transformedSectorCompanies = filteredSCWithDetails.map((sc) => {
      const ticker = sc.ticker ?? ''
      const priceUsd = sc.price != null ? toUsd(sc.price, ticker) : null
      const marketCapUsd =
        sc.marketCap != null ? toUsd(sc.marketCap, ticker) : null

      const currentSnapshot = isHistorical
        ? currentPricesMap.get(ticker) || null
        : null

      // Calculate price change from snapshot date to now (둘 다 USD 기준 → 비율 정확)
      let priceChangeFromSnapshot: number | null = null
      if (isHistorical && priceUsd && currentSnapshot?.price) {
        priceChangeFromSnapshot =
          ((currentSnapshot.price - priceUsd) / priceUsd) * 100
      }

      return {
        sectorId: sc.sectorId ?? '',
        ticker,
        rank: sc.rank,
        notes: sc.notes,
        company: {
          ticker,
          name: sc.companyName ?? '',
          nameKo: sc.companyNameKo,
          logoUrl: sc.logoUrl,
        },
        snapshot: marketCapUsd
          ? {
              date: sc.snapshotDate ?? selectedDate ?? '',
              marketCap: marketCapUsd,
              price: priceUsd,
              priceChange: sc.priceChange,
            }
          : null,
        score: toScoreSummary(sc),
        ...(isHistorical && {
          currentSnapshot,
          priceChangeFromSnapshot,
        }),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        categories: allCategories,
        sectors: allSectors,
        sectorCompanies: transformedSectorCompanies,
        lastUpdated: latestDate,
        selectedDate,
        availableDates,
        isHistorical,
        appliedRegion: region,
      },
    })
  } catch (error) {
    console.error('Map API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map data' },
      { status: 500 }
    )
  }
}
