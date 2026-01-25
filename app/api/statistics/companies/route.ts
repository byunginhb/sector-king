import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  sectorCompanies,
  companies,
  sectors,
  dailySnapshots,
} from '@/drizzle/schema'
import { eq, sql, desc, asc } from 'drizzle-orm'
import type { ApiResponse, CompanyStatisticsResponse, CompanyStatItem } from '@/types'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CompanyStatisticsResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const sort = searchParams.get('sort') || 'count'
    const order = searchParams.get('order') || 'desc'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const db = getDb()

    // Get all sector-company mappings with company info
    const allMappings = await db
      .select({
        ticker: sectorCompanies.ticker,
        companyName: companies.name,
        companyNameKo: companies.nameKo,
        sectorId: sectorCompanies.sectorId,
        sectorName: sectors.name,
        rank: sectorCompanies.rank,
      })
      .from(sectorCompanies)
      .leftJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
      .leftJoin(sectors, eq(sectorCompanies.sectorId, sectors.id))

    // Aggregate by company
    const companyMap = new Map<string, {
      ticker: string
      name: string
      nameKo: string | null
      sectors: { id: string; name: string; rank: number }[]
    }>()

    for (const mapping of allMappings) {
      if (!mapping.ticker) continue

      const existing = companyMap.get(mapping.ticker)
      if (existing) {
        existing.sectors.push({
          id: mapping.sectorId || '',
          name: mapping.sectorName || '',
          rank: mapping.rank || 0,
        })
      } else {
        companyMap.set(mapping.ticker, {
          ticker: mapping.ticker,
          name: mapping.companyName || '',
          nameKo: mapping.companyNameKo || null,
          sectors: [{
            id: mapping.sectorId || '',
            name: mapping.sectorName || '',
            rank: mapping.rank || 0,
          }],
        })
      }
    }

    // Get latest snapshots for all companies
    const latestSnapshots = await db
      .select({
        ticker: dailySnapshots.ticker,
        marketCap: dailySnapshots.marketCap,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
      })
      .from(dailySnapshots)
      .where(
        sql`${dailySnapshots.date} = (
          SELECT MAX(date) FROM daily_snapshots WHERE ticker = ${dailySnapshots.ticker}
        )`
      )

    const snapshotMap = new Map<string, {
      marketCap: number | null
      price: number | null
      priceChange: number | null
    }>()

    for (const snapshot of latestSnapshots) {
      if (snapshot.ticker) {
        snapshotMap.set(snapshot.ticker, {
          marketCap: snapshot.marketCap,
          price: snapshot.price,
          priceChange: snapshot.priceChange,
        })
      }
    }

    // Build company stats array
    const companyStats: CompanyStatItem[] = Array.from(companyMap.values()).map((company) => ({
      ticker: company.ticker,
      name: company.name,
      nameKo: company.nameKo,
      count: company.sectors.length,
      sectors: company.sectors.sort((a, b) => a.rank - b.rank),
      latestSnapshot: snapshotMap.get(company.ticker) || null,
    }))

    // Sort
    companyStats.sort((a, b) => {
      let comparison = 0
      switch (sort) {
        case 'count':
          comparison = b.count - a.count
          break
        case 'marketCap':
          comparison = (b.latestSnapshot?.marketCap || 0) - (a.latestSnapshot?.marketCap || 0)
          break
        case 'name':
          comparison = (a.nameKo || a.name).localeCompare(b.nameKo || b.name, 'ko')
          break
        default:
          comparison = b.count - a.count
      }
      return order === 'asc' ? -comparison : comparison
    })

    // Paginate
    const total = companyStats.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedCompanies = companyStats.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      success: true,
      data: {
        companies: paginatedCompanies,
        total,
        page,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Statistics Companies API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company statistics' },
      { status: 500 }
    )
  }
}
