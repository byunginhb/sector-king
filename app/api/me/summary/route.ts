/**
 * GET /api/me/summary — 메인 화면용 PnL/카운트 요약.
 *
 * - 워치 ticker 목록을 Postgres 에서 가져온다 (RLS 자동).
 * - 각 ticker 의 최근 daily_snapshot 1행을 SQLite (`getDb()`) 에서 join.
 * - 평균 변동률, 상승 top 3, 하락 top 3 를 산출.
 * - 메모/최근 본 종목 카운트도 함께 반환.
 */
import { NextResponse } from 'next/server'
import { inArray, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { getDb, schema } from '@/lib/db'
import type { ApiResponse } from '@/types'
import type {
  MyWatchPnlItem,
  MySummaryDTO,
} from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const supabase = await createClient()
    const userId = guard.profile.id

    // 1) 워치 ticker 목록
    const { data: watchRows, error: watchErr } = await supabase
      .from('watchlist')
      .select('item_key, display_name')
      .eq('user_id', userId)
      .eq('item_type', 'ticker')

    if (watchErr) {
      console.error('[GET /api/me/summary] watch', watchErr.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '요약을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const tickers = (watchRows ?? []).map((r) => r.item_key as string)

    // 2) 카운트 (메모/최근본)
    const [{ count: noteCount }, { count: rvCount }] = await Promise.all([
      supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('recently_viewed')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    // 3) 워치 종목별 최근 snapshot
    const items: MyWatchPnlItem[] = []

    if (tickers.length > 0) {
      const db = getDb()
      // ticker 별 최신 1행만 윈도우 함수로 가져오기 (SQLite 3.25+ 지원).
      // 기존: 전체 행 desc 정렬 후 메모리에서 첫행 추출 (200 ticker × N일 = 큰 비용).
      // 개선: row_number() over (partition by ticker order by date desc) = 1.
      const snapshots = (await db.all(sql`
        select ticker, date, market_cap as marketCap, price, price_change as priceChange
          from (
            select
              ticker, date, market_cap, price, price_change,
              row_number() over (partition by ticker order by date desc) as rn
              from daily_snapshots
             where ticker in (${sql.join(
               tickers.map((t) => sql`${t}`),
               sql`, `
             )})
          ) t
         where rn = 1
      `)) as Array<{
        ticker: string
        date: string
        marketCap: number | null
        price: number | null
        priceChange: number | null
      }>

      const byTicker = new Map<
        string,
        {
          marketCap: number | null
          price: number | null
          priceChange: number | null
        }
      >()
      for (const row of snapshots) {
        if (!row.ticker) continue
        byTicker.set(row.ticker, {
          marketCap: row.marketCap ?? null,
          price: row.price ?? null,
          priceChange: row.priceChange ?? null,
        })
      }

      // 회사 한국 이름 매핑
      const companyRows = await db
        .select({
          ticker: schema.companies.ticker,
          name: schema.companies.name,
          nameKo: schema.companies.nameKo,
        })
        .from(schema.companies)
        .where(inArray(schema.companies.ticker, tickers))

      const nameByTicker = new Map<string, { ko: string | null; en: string }>()
      for (const r of companyRows) {
        nameByTicker.set(r.ticker, { ko: r.nameKo, en: r.name })
      }

      for (const w of watchRows ?? []) {
        const ticker = w.item_key as string
        const snap = byTicker.get(ticker) ?? null
        const display = w.display_name as string | null
        const nameMap = nameByTicker.get(ticker)
        items.push({
          ticker,
          displayName: display ?? nameMap?.ko ?? nameMap?.en ?? ticker,
          marketCap: snap?.marketCap ?? null,
          price: snap?.price ?? null,
          priceChange: snap?.priceChange ?? null,
        })
      }
    }

    // 4) 집계
    const withChange = items.filter(
      (i) => typeof i.priceChange === 'number' && Number.isFinite(i.priceChange)
    )
    const averageChange =
      withChange.length > 0
        ? withChange.reduce((acc, i) => acc + (i.priceChange ?? 0), 0) /
          withChange.length
        : null

    const sortedDesc = [...withChange].sort(
      (a, b) => (b.priceChange ?? 0) - (a.priceChange ?? 0)
    )
    const topGainers = sortedDesc.slice(0, 3)
    const topLosers = [...sortedDesc].reverse().slice(0, 3)

    const summary: MySummaryDTO = {
      watchCount: tickers.length,
      noteCount: noteCount ?? 0,
      recentlyViewedCount: rvCount ?? 0,
      topGainers,
      topLosers,
      averageChange,
    }

    const body: ApiResponse<{ summary: MySummaryDTO; items: MyWatchPnlItem[] }> = {
      success: true,
      data: { summary, items },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/me/summary]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
