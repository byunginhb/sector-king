import { NextRequest, NextResponse } from 'next/server'
import { and, gte, lte } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { sectorCompanies, dailySnapshots } from '@/drizzle/schema'
import { toUsd } from '@/lib/currency'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, DailyMarketResponse } from '@/types'

export const revalidate = 3600

/** YYYY-MM-DD 형식이면서 실재 날짜인지. */
function isValidDate(raw: string | null): raw is string {
  if (raw === null || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  return Number.isFinite(Date.parse(`${raw}T00:00:00Z`))
}

/** 두 날짜 사이 일수. */
function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
  )
}

/**
 * GET /api/reports/daily-market?start=YYYY-MM-DD&end=YYYY-MM-DD&excludeId=
 *
 * 월간 리포트 기간의 "추적 종목 시총" 일별 추이(기간 시작=0% 정규화)와,
 * 급등·급락일을 그날 발행된 데일리 리포트로 연결한 데이터(#28).
 * - 시총 합은 distinct 추적 티커 기준 + toUsd(멀티산업 중복·통화 왜곡 방지).
 * - 뉴스 링크: Supabase news_reports 에서 기간 내 발행본 날짜→id 매핑(현재 리포트 제외).
 * - dailySnapshots 보관 범위(최근 ~119거래일) 밖 기간은 points 가 비어 온다(호출부에서 섹션 숨김).
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DailyMarketResponse>>> {
  try {
    const params = request.nextUrl.searchParams
    const start = params.get('start')
    const end = params.get('end')
    const excludeId = params.get('excludeId')

    if (!isValidDate(start) || !isValidDate(end) || start > end) {
      return NextResponse.json(
        { success: false, error: 'Invalid start/end' },
        { status: 400 }
      )
    }
    // 월 단위 리포트라 상한을 넉넉히(62일) 둔다.
    if (daysBetween(start, end) > 62) {
      return NextResponse.json(
        { success: false, error: 'Range too wide' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 추적 종목(distinct) — region 전체 기준(리포트의 "추적 종목 시총 변화"와 동일 모집단).
    const scRows = await db
      .select({ ticker: sectorCompanies.ticker })
      .from(sectorCompanies)
    const tickerSet = new Set<string>()
    for (const r of scRows) if (r.ticker) tickerSet.add(r.ticker)

    // 기간 내 스냅샷 로드(추적 티커만).
    const snapshots = await db
      .select({
        ticker: dailySnapshots.ticker,
        date: dailySnapshots.date,
        marketCap: dailySnapshots.marketCap,
      })
      .from(dailySnapshots)
      .where(and(gte(dailySnapshots.date, start), lte(dailySnapshots.date, end)))

    // 티커별 (date→USD 시총). 구성원 변화로 인한 합계 왜곡을 막기 위해
    // "모든 거래일에 존재하는 티커"만 합산한다(월중 종목 대량 적재/누락 방어).
    const dateSet = new Set<string>()
    const byTicker = new Map<string, Map<string, number>>()
    for (const s of snapshots) {
      if (!s.ticker || !s.date || !tickerSet.has(s.ticker)) continue
      dateSet.add(s.date)
      let m = byTicker.get(s.ticker)
      if (!m) {
        m = new Map()
        byTicker.set(s.ticker, m)
      }
      m.set(s.date, toUsd(s.marketCap || 0, s.ticker))
    }

    const datesAsc = [...dateSet].sort()
    if (datesAsc.length < 2) {
      return NextResponse.json({
        success: true,
        data: { points: [], spikeDate: null, dropDate: null },
      })
    }

    // 전 거래일에 값이 있는 티커만 = 고정 구성원 인덱스.
    const totalByDate = new Map<string, number>()
    for (const date of datesAsc) totalByDate.set(date, 0)
    for (const [, series] of byTicker) {
      if (series.size !== datesAsc.length) continue // 일부 날 누락 → 제외
      for (const date of datesAsc) {
        totalByDate.set(date, (totalByDate.get(date) ?? 0) + (series.get(date) ?? 0))
      }
    }

    // 기간 내 발행 데일리 리포트 날짜 → { id, title } (현재 월간 리포트 제외).
    const newsByDate = new Map<string, { id: string; title: string }>()
    try {
      const supabase = await createClient()
      const { data: reports } = await supabase
        .from('news_reports')
        .select('id, report_date, title')
        .eq('status', 'published')
        .gte('report_date', start)
        .lte('report_date', end)
      for (const r of reports ?? []) {
        if (excludeId && r.id === excludeId) continue
        // 같은 날 여러 건이면 먼저 온 것 유지(목록 순서 무관 — 링크 존재 여부만 중요).
        if (!newsByDate.has(r.report_date)) {
          newsByDate.set(r.report_date, { id: r.id, title: r.title })
        }
      }
    } catch {
      // 뉴스 조회 실패는 치명적이지 않음 — 링크 없이 라인만 노출.
    }

    const firstTotal = totalByDate.get(datesAsc[0]) ?? 0
    let spikeDate: string | null = null
    let dropDate: string | null = null
    let maxDay = -Infinity
    let minDay = Infinity

    const points = datesAsc.map((date, i) => {
      const total = totalByDate.get(date) ?? 0
      const pct = firstTotal > 0 ? ((total - firstTotal) / firstTotal) * 100 : 0
      const prev = i > 0 ? totalByDate.get(datesAsc[i - 1]) : undefined
      const dayPct =
        prev && prev > 0 ? ((total - prev) / prev) * 100 : null
      if (dayPct != null) {
        if (dayPct > maxDay) {
          maxDay = dayPct
          spikeDate = date
        }
        if (dayPct < minDay) {
          minDay = dayPct
          dropDate = date
        }
      }
      const news = newsByDate.get(date)
      return {
        date,
        pct: Math.round(pct * 100) / 100,
        dayPct: dayPct == null ? null : Math.round(dayPct * 100) / 100,
        newsId: news?.id ?? null,
        newsTitle: news?.title ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data: { points, spikeDate, dropDate },
    })
  } catch (error) {
    console.error('Daily market API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily market' },
      { status: 500 }
    )
  }
}
