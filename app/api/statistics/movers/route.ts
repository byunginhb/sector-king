import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { dailySnapshots, companies } from '@/drizzle/schema'
import { matchesRegion, resolveRegion } from '@/lib/region'

import { toUsd } from '@/lib/currency'
import { resolveIndustryFilter, clampIntParam } from '@/lib/api-helpers'
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

    /**
     * 산업 스코프 — 자금 흐름 카드 안의 시세 띠가 그 산업 종목만 흘리기 위한 것.
     * 다른 API 와 같은 `?industry=` 규약·같은 헬퍼를 쓴다(생략 시 전체 = 기존 동작).
     */
    const industryResult = await resolveIndustryFilter(searchParams)
    if ('errorResponse' in industryResult) {
      return industryResult.errorResponse as NextResponse<ApiResponse<DailyMoversResponse>>
    }
    const industryTickers = industryResult.filter?.tickers ?? null

    /**
     * 시총 하한(USD) — 띠에 잡주가 흐르면 정보가 아니라 소음이다.
     * 기본 0(제한 없음)이라 기존 호출자는 동작이 바뀌지 않는다.
     */
    const minMarketCapUsd = clampIntParam(searchParams, 'minMarketCap', {
      fallback: 0,
      min: 0,
      max: 5_000_000_000_000,
    })

    const limit = clampIntParam(searchParams, 'limit', {
      fallback: 30,
      min: 1,
      max: 100,
    })

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
        marketCap: dailySnapshots.marketCap,
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
      if (industryTickers && !industryTickers.includes(row.ticker)) return false
      // 시총은 네이티브 통화라 비교 전에 USD 로 맞춘다 — 안 하면 원화 종목이
      // 1450배 부풀어 하한을 무조건 통과한다.
      if (minMarketCapUsd > 0) {
        if (row.marketCap == null) return false
        if (toUsd(row.marketCap, row.ticker) < minMarketCapUsd) return false
      }
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
      price: row.price !== null ? toUsd(row.price, row.ticker) : null,
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
