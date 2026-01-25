import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  companies,
  companyProfiles,
  dailySnapshots,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import type { ApiResponse, CompanyDetailResponse } from '@/types'

export const revalidate = 3600 // 1 hour cache

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
): Promise<NextResponse<ApiResponse<CompanyDetailResponse>>> {
  try {
    const { ticker } = await params
    const db = getDb()

    // Get company info
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.ticker, ticker))
      .limit(1)

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    // Get company profile
    const profile = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.ticker, ticker))
      .limit(1)

    // Get latest snapshot
    const snapshot = await db
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.ticker, ticker))
      .orderBy(desc(dailySnapshots.date))
      .limit(1)

    // Get price history (last 30 days)
    const history = await db
      .select({
        date: dailySnapshots.date,
        price: dailySnapshots.price,
        volume: dailySnapshots.volume,
      })
      .from(dailySnapshots)
      .where(eq(dailySnapshots.ticker, ticker))
      .orderBy(desc(dailySnapshots.date))
      .limit(30)

    // Get sectors this company belongs to
    const companySectors = await db
      .select({
        sectorId: sectorCompanies.sectorId,
        rank: sectorCompanies.rank,
        sectorName: sectors.name,
        sectorNameEn: sectors.nameEn,
      })
      .from(sectorCompanies)
      .leftJoin(sectors, eq(sectorCompanies.sectorId, sectors.id))
      .where(eq(sectorCompanies.ticker, ticker))

    return NextResponse.json({
      success: true,
      data: {
        company: company[0],
        profile: profile[0] || null,
        snapshot: snapshot[0]
          ? {
              marketCap: snapshot[0].marketCap,
              price: snapshot[0].price,
              priceChange: snapshot[0].priceChange,
              week52High: snapshot[0].week52High,
              week52Low: snapshot[0].week52Low,
              volume: snapshot[0].volume,
              peRatio: snapshot[0].peRatio,
              pegRatio: snapshot[0].pegRatio,
            }
          : null,
        history: history
          .filter((h) => h.price !== null)
          .map((h) => ({
            date: h.date,
            price: h.price as number,
            volume: h.volume || 0,
          }))
          .reverse(),
        sectors: companySectors.map((s) => ({
          sector: {
            id: s.sectorId ?? '',
            name: s.sectorName ?? '',
            nameEn: s.sectorNameEn,
          },
          rank: s.rank,
        })),
      },
    })
  } catch (error) {
    console.error('Company API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}
