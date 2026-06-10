import 'server-only'
import { getDb } from '@/lib/db'
import { companies, dailySnapshots } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { toUsd } from '@/lib/currency'

/** `/stock/[ticker]` 라우트 파라미터 검증 정규식 (ASCII 티커만). */
export const TICKER_PATTERN = /^[A-Za-z0-9.\-]{1,12}$/

export function isValidTicker(ticker: string): boolean {
  return TICKER_PATTERN.test(ticker)
}

export interface StockServerSummary {
  ticker: string
  name: string
  nameKo: string | null
  /** USD 정규화된 시가총액 (없으면 null) */
  marketCapUsd: number | null
}

/**
 * 서버 컴포넌트(메타데이터/OG)용 종목 요약 조회.
 * 미존재 시 null. 가격성 필드는 toUsd 변환하여 반환한다(통화 규칙).
 */
export async function getStockSummary(ticker: string): Promise<StockServerSummary | null> {
  if (!isValidTicker(ticker)) return null
  const db = getDb()

  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.ticker, ticker))
    .limit(1)

  if (company.length === 0) return null

  const snapshot = await db
    .select({ marketCap: dailySnapshots.marketCap })
    .from(dailySnapshots)
    .where(eq(dailySnapshots.ticker, ticker))
    .orderBy(desc(dailySnapshots.date))
    .limit(1)

  const rawMarketCap = snapshot[0]?.marketCap ?? null

  return {
    ticker: company[0].ticker,
    name: company[0].name,
    nameKo: company[0].nameKo,
    marketCapUsd: rawMarketCap != null ? toUsd(rawMarketCap, ticker) : null,
  }
}

/** sitemap 등록용 — 현재 DB 에 존재하는 모든 티커(= active). */
export async function getAllStockTickers(): Promise<string[]> {
  const db = getDb()
  const rows = await db.select({ ticker: companies.ticker }).from(companies)
  return rows.map((r) => r.ticker)
}
