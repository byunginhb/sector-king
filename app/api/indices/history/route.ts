import { NextRequest, NextResponse } from 'next/server'
import { and, asc, gte, lte, sql } from 'drizzle-orm'
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
  range: IndexRange | 'custom'
  series: IndexHistorySeries[]
}

function resolveRange(raw: string | null): IndexRange {
  return RANGES.includes(raw as IndexRange) ? (raw as IndexRange) : '1y'
}

/** YYYY-MM-DD 형식이면서 실재하는 날짜인지 검증. */
function isValidDate(raw: string | null): raw is string {
  if (raw === null || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  const t = Date.parse(`${raw}T00:00:00Z`)
  return Number.isFinite(t)
}

/** 두 날짜(YYYY-MM-DD) 사이 일수. */
function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`)
  const b = Date.parse(`${end}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<IndicesHistoryResponse>>> {
  try {
    const params = req.nextUrl.searchParams
    const startRaw = params.get('start')
    const endRaw = params.get('end')
    // 커스텀 구간: start·end 둘 다 유효한 날짜이고 start ≤ end 일 때만 우선 적용(#30).
    const custom =
      isValidDate(startRaw) && isValidDate(endRaw) && startRaw <= endRaw
        ? { start: startRaw, end: endRaw }
        : null
    const range = resolveRange(params.get('range'))
    const responseRange: IndexRange | 'custom' = custom ? 'custom' : range
    const db = getDb()

    let dateFilter
    let step: number
    if (custom) {
      dateFilter = and(
        gte(marketIndexHistory.date, custom.start),
        lte(marketIndexHistory.date, custom.end)
      )
      // 긴 구간(≈2년+)은 주간(5거래일) 샘플링으로 페이로드 경량화.
      step = daysBetween(custom.start, custom.end) > 750 ? 5 : 1
    } else {
      // 최신 거래일 기준으로 cutoff 계산(서버 now 가 아니라 데이터 기준 — 주말/휴장 안전).
      const maxRows = await db
        .select({ maxDate: sql<string | null>`max(${marketIndexHistory.date})` })
        .from(marketIndexHistory)
      const maxDate = maxRows[0]?.maxDate ?? null
      if (!maxDate) {
        return NextResponse.json({
          success: true,
          data: { range: responseRange, series: [] },
        })
      }
      const cutoff = new Date(`${maxDate}T00:00:00Z`)
      cutoff.setUTCDate(cutoff.getUTCDate() - RANGE_DAYS[range])
      dateFilter = gte(marketIndexHistory.date, cutoff.toISOString().slice(0, 10))
      step = RANGE_STEP[range]
    }

    const [meta, rows] = await Promise.all([
      db.select().from(marketIndices).orderBy(asc(marketIndices.sortOrder)),
      db
        .select({
          symbol: marketIndexHistory.symbol,
          date: marketIndexHistory.date,
          close: marketIndexHistory.close,
        })
        .from(marketIndexHistory)
        .where(dateFilter)
        .orderBy(asc(marketIndexHistory.symbol), asc(marketIndexHistory.date)),
    ])

    const bySymbol = new Map<string, { date: string; close: number }[]>()
    for (const r of rows) {
      const arr = bySymbol.get(r.symbol) ?? []
      arr.push({ date: r.date, close: r.close })
      bySymbol.set(r.symbol, arr)
    }

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

    return NextResponse.json({ success: true, data: { range: responseRange, series } })
  } catch (error) {
    console.error('Indices history API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch index history' },
      { status: 500 }
    )
  }
}
