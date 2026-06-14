import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sectorCompanies, companies, dailySnapshots } from '@/drizzle/schema'
import { eq, desc, gte } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'
import { resolveRegion, regionFilterToValue } from '@/lib/region'
import { clampIntParam } from '@/lib/api-helpers'
import type { ApiResponse, MarketCapHistoryResponse } from '@/types'

export const revalidate = 3600

/**
 * GET /api/statistics/market-cap?region=&range=
 *
 * "추적 종목 시총"(중복 제거) 일자별 추이. MARKET PULSE 카드 드릴다운 전용.
 * - 산업 합산이 아니라 distinct ticker 기준이라 멀티산업 종목 중복 없음.
 * - 가격성 값은 toUsd 로 USD 정규화(클라이언트가 통화 토글로 ₩/$ 표기).
 * - region(all/kr/global) 적용.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<MarketCapHistoryResponse>>> {
  try {
    const db = getDb()
    const searchParams = request.nextUrl.searchParams
    const region = resolveRegion(searchParams)
    const regionValue = regionFilterToValue(region)
    // 거래일 수 (보유 99일 내에서 클램프). 기본 90.
    const range = clampIntParam(searchParams, 'range', {
      fallback: 90,
      min: 7,
      max: 120,
    })

    // 최신순 거래일 → range+1 (전일 대비 계산용 여유 1)
    const dateRows = await db
      .selectDistinct({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(range + 1)
    const datesDesc = dateRows
      .map((d) => d.date)
      .filter((d): d is string => d !== null)
    if (datesDesc.length === 0) {
      return NextResponse.json({
        success: true,
        data: { history: [], tickerCount: 0, appliedRegion: region },
      })
    }
    const oldestDate = datesDesc[datesDesc.length - 1]

    // region 적용 distinct 추적 종목
    const scRows = regionValue
      ? await db
          .select({ ticker: sectorCompanies.ticker })
          .from(sectorCompanies)
          .innerJoin(companies, eq(sectorCompanies.ticker, companies.ticker))
          .where(eq(companies.region, regionValue))
      : await db
          .select({ ticker: sectorCompanies.ticker })
          .from(sectorCompanies)
    const tickerSet = new Set<string>()
    for (const r of scRows) {
      if (r.ticker) tickerSet.add(r.ticker)
    }

    // 윈도우 내 스냅샷 → date 별 USD 시총 합 (distinct ticker만)
    const snapshots = await db
      .select({
        ticker: dailySnapshots.ticker,
        date: dailySnapshots.date,
        marketCap: dailySnapshots.marketCap,
      })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, oldestDate))

    const totalByDate = new Map<string, number>()
    for (const s of snapshots) {
      if (!s.ticker || !s.date || !tickerSet.has(s.ticker)) continue
      const usd = toUsd(s.marketCap || 0, s.ticker)
      totalByDate.set(s.date, (totalByDate.get(s.date) ?? 0) + usd)
    }

    // 오래된 → 최신 정렬 후 전일 대비 계산.
    // datesDesc 는 range+1 개(여유 1일)라 가장 오래된 날은 전일대비 기준일로만 쓰고 표시에서 제외 →
    // 반환 history 는 정확히 range 개(또는 보유 한도)이며 모든 행이 전일대비 값을 가진다.
    const datesAsc = [...datesDesc].sort()
    const fullHistory = datesAsc.map((date, i) => {
      const marketCapUsd = totalByDate.get(date) ?? 0
      const prev = i > 0 ? totalByDate.get(datesAsc[i - 1]) : undefined
      const changePct =
        prev && prev > 0
          ? Math.round(((marketCapUsd - prev) / prev) * 10000) / 100
          : null
      return { date, marketCapUsd, changePct }
    })
    // 여유분 1일 이상 확보됐을 때만 가장 오래된 기준일을 표시에서 제외
    const history = fullHistory.length > 1 ? fullHistory.slice(1) : fullHistory

    return NextResponse.json({
      success: true,
      data: {
        history,
        tickerCount: tickerSet.size,
        appliedRegion: region,
      },
    })
  } catch (error) {
    console.error('Market cap history API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market cap history' },
      { status: 500 }
    )
  }
}
