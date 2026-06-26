import { NextRequest, NextResponse } from 'next/server'
import { asc, gte, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { marketIndices, marketIndexHistory } from '@/drizzle/schema'
import type { ApiResponse } from '@/types'

export const revalidate = 3600

export type IndexRange = '1w' | '1m' | '1y' | '5y'
const RANGES: readonly IndexRange[] = ['1w', '1m', '1y', '5y'] as const

// 기간 → 조회 일수. 5y 는 전체(≈5년).
const RANGE_DAYS: Record<IndexRange, number> = {
  '1w': 7,
  '1m': 31,
  '1y': 366,
  '5y': 1830,
}
// 5y 는 주간(매 5거래일) 샘플링으로 페이로드 경량화. 그 외는 일별 전체.
const RANGE_STEP: Record<IndexRange, number> = { '1w': 1, '1m': 1, '1y': 1, '5y': 5 }

export interface IndexHistorySeries {
  symbol: string
  country: string
  name: string
  points: { date: string; close: number }[]
}

export interface IndicesHistoryResponse {
  range: IndexRange
  series: IndexHistorySeries[]
}

function resolveRange(raw: string | null): IndexRange {
  return RANGES.includes(raw as IndexRange) ? (raw as IndexRange) : '1y'
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<IndicesHistoryResponse>>> {
  try {
    const range = resolveRange(req.nextUrl.searchParams.get('range'))
    const db = getDb()

    // 최신 거래일 기준으로 cutoff 계산(서버 now 가 아니라 데이터 기준 — 주말/휴장 안전).
    const maxRows = await db
      .select({ maxDate: sql<string | null>`max(${marketIndexHistory.date})` })
      .from(marketIndexHistory)
    const maxDate = maxRows[0]?.maxDate ?? null
    if (!maxDate) {
      return NextResponse.json({ success: true, data: { range, series: [] } })
    }
    const cutoff = new Date(`${maxDate}T00:00:00Z`)
    cutoff.setUTCDate(cutoff.getUTCDate() - RANGE_DAYS[range])
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const [meta, rows] = await Promise.all([
      db.select().from(marketIndices).orderBy(asc(marketIndices.sortOrder)),
      db
        .select({
          symbol: marketIndexHistory.symbol,
          date: marketIndexHistory.date,
          close: marketIndexHistory.close,
        })
        .from(marketIndexHistory)
        .where(gte(marketIndexHistory.date, cutoffStr))
        .orderBy(asc(marketIndexHistory.symbol), asc(marketIndexHistory.date)),
    ])

    const bySymbol = new Map<string, { date: string; close: number }[]>()
    for (const r of rows) {
      const arr = bySymbol.get(r.symbol) ?? []
      arr.push({ date: r.date, close: r.close })
      bySymbol.set(r.symbol, arr)
    }

    const step = RANGE_STEP[range]
    const series: IndexHistorySeries[] = meta
      .map((m) => {
        const all = bySymbol.get(m.symbol) ?? []
        // 샘플링: 매 step 번째 + 마지막 점은 항상 포함(현재값 보존).
        const points =
          step <= 1
            ? all
            : all.filter((_, i) => i % step === 0 || i === all.length - 1)
        return { symbol: m.symbol, country: m.country, name: m.name, points }
      })
      .filter((s) => s.points.length > 0)

    return NextResponse.json({ success: true, data: { range, series } })
  } catch (error) {
    console.error('Indices history API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch index history' },
      { status: 500 }
    )
  }
}
