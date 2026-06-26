import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { marketIndices } from '@/drizzle/schema'
import type { ApiResponse } from '@/types'

export const revalidate = 3600

export interface MarketIndexItem {
  symbol: string
  country: string
  name: string
  /** 지수 레벨(포인트). 통화 아님 → 환산 없음. */
  price: number | null
  /** 1일 등락률(%). */
  changePercent: number | null
  week52High: number | null
  week52Low: number | null
  /** 52주 밴드 내 위치 0~1 (고점 근처/저점권 판단용). */
  week52Position: number | null
  asOfDate: string | null
}

export interface IndicesResponse {
  items: MarketIndexItem[]
}

export async function GET(): Promise<NextResponse<ApiResponse<IndicesResponse>>> {
  try {
    const db = getDb()
    const rows = await db
      .select()
      .from(marketIndices)
      .orderBy(asc(marketIndices.sortOrder))

    const items: MarketIndexItem[] = rows.map((r) => {
      const week52Position =
        r.price != null &&
        r.week52High != null &&
        r.week52Low != null &&
        r.week52High > r.week52Low
          ? Math.min(Math.max((r.price - r.week52Low) / (r.week52High - r.week52Low), 0), 1)
          : null
      return {
        symbol: r.symbol,
        country: r.country,
        name: r.name,
        price: r.price,
        changePercent: r.changePercent,
        week52High: r.week52High,
        week52Low: r.week52Low,
        week52Position,
        asOfDate: r.asOfDate,
      }
    })

    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error('Indices API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
