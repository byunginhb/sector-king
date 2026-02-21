import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectors,
  categories,
  sectorCompanies,
  companies,
  companyScores,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import type { ApiResponse, SectorDetailResponse } from '@/types'
import { toScoreSummary } from '@/lib/format'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectorId: string }> }
): Promise<NextResponse<ApiResponse<SectorDetailResponse>>> {
  try {
    const { sectorId } = await params
    const db = getDb()

    // Get sector info
    const sector = await db
      .select()
      .from(sectors)
      .where(eq(sectors.id, sectorId))
      .limit(1)

    if (sector.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sector not found' },
        { status: 404 }
      )
    }

    // Get category info
    const category = sector[0].categoryId
      ? await db
          .select()
          .from(categories)
          .where(eq(categories.id, sector[0].categoryId))
          .limit(1)
      : []

    // Get companies in this sector with snapshot data and scores
    const sectorCompaniesWithDetails = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        ticker: sectorCompanies.ticker,
        rank: sectorCompanies.rank,
        notes: sectorCompanies.notes,
        companyName: companies.name,
        companyNameKo: companies.nameKo,
        logoUrl: companies.logoUrl,
        snapshotDate: dailySnapshots.date,
        marketCap: dailySnapshots.marketCap,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
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
        sql`${sectorCompanies.ticker} = ${dailySnapshots.ticker} AND ${dailySnapshots.date} = (
          SELECT MAX(date) FROM daily_snapshots WHERE ticker = ${sectorCompanies.ticker}
        )`
      )
      .leftJoin(companyScores, eq(sectorCompanies.ticker, companyScores.ticker))
      .where(eq(sectorCompanies.sectorId, sectorId))
      .orderBy(sectorCompanies.rank)

    // Calculate total market cap
    const marketCapTotal = sectorCompaniesWithDetails.reduce(
      (sum, sc) => sum + (sc.marketCap || 0),
      0
    )

    // Transform data
    const transformedCompanies = sectorCompaniesWithDetails.map((sc) => ({
      sectorId: sc.sectorId ?? '',
      ticker: sc.ticker ?? '',
      rank: sc.rank,
      notes: sc.notes,
      company: {
        ticker: sc.ticker ?? '',
        name: sc.companyName ?? '',
        nameKo: sc.companyNameKo,
        logoUrl: sc.logoUrl,
      },
      snapshot: sc.marketCap
        ? {
            date: sc.snapshotDate ?? '',
            marketCap: sc.marketCap,
            price: sc.price,
            priceChange: sc.priceChange,
          }
        : null,
      score: toScoreSummary(sc),
    }))

    return NextResponse.json({
      success: true,
      data: {
        sector: sector[0],
        category: category[0] || null,
        companies: transformedCompanies,
        marketCapTotal,
      },
    })
  } catch (error) {
    console.error('Sector API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sector data' },
      { status: 500 }
    )
  }
}
