import { asc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { marketIndices } from '@/drizzle/schema'

export interface MarketIndexItem {
  symbol: string
  country: string
  name: string
  /** 지수 레벨(포인트). 통화 아님 → 환산 없음. */
  price: number | null
  /** 1일 등락률(%). */
  changePercent: number | null
  /** 1주 등락률(%). */
  change1w: number | null
  /** 1달 등락률(%). */
  change1m: number | null
  /** 1년 등락률(%). */
  change1y: number | null
  week52High: number | null
  week52Low: number | null
  /** 52주 밴드 내 위치 0~1 (고점 근처/저점권 판단용). */
  week52Position: number | null
  asOfDate: string | null
}

/**
 * 세계 주요 지수 스냅샷 — API 라우트와 페이지(SSR)가 공유하는 단일 조회 함수.
 * market_indices 테이블에서 정렬·52주 위치 산출.
 */
export async function getMarketIndices(): Promise<MarketIndexItem[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(marketIndices)
    .orderBy(asc(marketIndices.sortOrder))

  return rows.map((r) => {
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
      change1w: r.change1w,
      change1m: r.change1m,
      change1y: r.change1y,
      week52High: r.week52High,
      week52Low: r.week52Low,
      week52Position,
      asOfDate: r.asOfDate,
    }
  })
}
