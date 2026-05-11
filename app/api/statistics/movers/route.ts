import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { dailySnapshots, companies } from '@/drizzle/schema'
import { matchesRegion, resolveRegion } from '@/lib/region'
import type { ApiResponse, RegionFilter } from '@/types'

export const revalidate = 3600

export interface DailyMoverItem {
  ticker: string
  name: string | null
  nameKo: string | null
  percentChange: number
  price: number | null
}

export interface DailyMoversResponse {
  date: string | null
  items: DailyMoverItem[]
  appliedRegion: RegionFilter
}

/**
 * GET /api/statistics/movers
 *
 * 가장 최근 daily_snapshots 날짜의 `price_change` 값 절댓값 기준 상위 종목을 반환한다.
 * - region 필터(`all|kr|global`) 지원 — `matchesRegion(ticker, region)` 사용
 * - `price_change` 가 null 인 row 는 제외
 * - limit: 1~100 (default 30)
 *
 * 참고: `dailySnapshots.priceChange` 는 percent 단위 일별 변화율(이미 % 값)이다.
 * 한국 종목 휴장일에도 직전 영업일 시점 변화율을 보유하므로, 0% 캐리 문제를 회피한다.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DailyMoversResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const region = resolveRegion(searchParams)

    const rawLimit = parseInt(searchParams.get('limit') || '30', 10)
    const limit = Number.isNaN(rawLimit)
      ? 30
      : Math.max(1, Math.min(rawLimit, 100))

    const db = getDb()

    // 가장 최근 스냅샷 날짜
    const [latestDateRow] = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1)

    const latestDate = latestDateRow?.date ?? null

    if (!latestDate) {
      return NextResponse.json({
        success: true,
        data: {
          date: null,
          items: [],
          appliedRegion: region,
        },
      })
    }

    // 해당 날짜의 모든 row 와 회사 정보 조인
    const rows = await db
      .select({
        ticker: dailySnapshots.ticker,
        price: dailySnapshots.price,
        priceChange: dailySnapshots.priceChange,
        name: companies.name,
        nameKo: companies.nameKo,
      })
      .from(dailySnapshots)
      .leftJoin(companies, eq(dailySnapshots.ticker, companies.ticker))
      .where(eq(dailySnapshots.date, latestDate))

    const filtered = rows.filter((row): row is typeof row & {
      ticker: string
      priceChange: number
    } => {
      if (!row.ticker) return false
      if (typeof row.priceChange !== 'number') return false
      return matchesRegion(row.ticker, region)
    })

    const sorted = [...filtered].sort(
      (a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange)
    )

    const items: DailyMoverItem[] = sorted.slice(0, limit).map((row) => ({
      ticker: row.ticker,
      name: row.name ?? null,
      nameKo: row.nameKo ?? null,
      percentChange: row.priceChange,
      price: row.price ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        date: latestDate,
        items,
        appliedRegion: region,
      },
    })
  } catch (error) {
    console.error('Movers API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily movers' },
      { status: 500 }
    )
  }
}
