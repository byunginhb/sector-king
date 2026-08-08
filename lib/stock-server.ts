import 'server-only'
import { getDb } from '@/lib/db'
import {
  companies,
  dailySnapshots,
  industries,
  industryCategories,
  sectorCompanies,
  sectors,
} from '@/drizzle/schema'
import { eq, desc, inArray } from 'drizzle-orm'
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
 * 초기 HTML 에 실을 종목 핵심 수치.
 *
 * 종목 상세는 데이터를 전부 React Query 로 받아서, JS 를 실행하지 않는 크롤러에게는
 * 회사명과 "불러오는 중" 밖에 남지 않았다. 여기서 뽑은 값을 서버에서 렌더링해
 * 초기 HTML 이 종목에 대해 실제로 답하도록 만든다.
 *
 * 가격성 필드는 전부 `toUsd(value, ticker)` 로 변환해서 반환한다.
 */
export interface StockServerFacts extends StockServerSummary {
  /** 최신 스냅샷 기준일 (YYYY-MM-DD). */
  date: string | null
  priceUsd: number | null
  /** 전일 대비 등락율(%). daily_snapshots.price_change 는 이미 % 라 통화 변환 불요. */
  priceChangePct: number | null
  week52HighUsd: number | null
  week52LowUsd: number | null
  /** 이 종목이 속한 섹터명 (사이트 분류 기준). */
  sectorNames: string[]
  /** 이 종목이 노출되는 산업 (id, name). */
  industries: { id: string; name: string }[]
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

/**
 * 종목 상세 초기 HTML 용 핵심 수치 + 분류. 미존재 시 null.
 * 가격성 필드는 toUsd 변환 후 반환한다(통화 규칙).
 */
export async function getStockFacts(ticker: string): Promise<StockServerFacts | null> {
  const summary = await getStockSummary(ticker)
  if (!summary) return null

  const db = getDb()

  const [snapshot] = await db
    .select({
      date: dailySnapshots.date,
      price: dailySnapshots.price,
      priceChange: dailySnapshots.priceChange,
      week52High: dailySnapshots.week52High,
      week52Low: dailySnapshots.week52Low,
    })
    .from(dailySnapshots)
    .where(eq(dailySnapshots.ticker, ticker))
    .orderBy(desc(dailySnapshots.date))
    .limit(1)

  const sectorRows = await db
    .select({
      sectorName: sectors.name,
      categoryId: sectors.categoryId,
    })
    .from(sectorCompanies)
    .innerJoin(sectors, eq(sectorCompanies.sectorId, sectors.id))
    .where(eq(sectorCompanies.ticker, ticker))

  const categoryIds = Array.from(
    new Set(sectorRows.map((r) => r.categoryId).filter((id): id is string => !!id))
  )

  const industryRows = categoryIds.length
    ? await db
        .selectDistinct({ id: industries.id, name: industries.name })
        .from(industryCategories)
        .innerJoin(industries, eq(industryCategories.industryId, industries.id))
        .where(inArray(industryCategories.categoryId, categoryIds))
    : []

  const usd = (v: number | null | undefined) => (v != null ? toUsd(v, ticker) : null)

  return {
    ...summary,
    date: snapshot?.date ?? null,
    priceUsd: usd(snapshot?.price),
    priceChangePct: snapshot?.priceChange ?? null,
    week52HighUsd: usd(snapshot?.week52High),
    week52LowUsd: usd(snapshot?.week52Low),
    sectorNames: Array.from(new Set(sectorRows.map((r) => r.sectorName))),
    industries: industryRows,
  }
}

/** sitemap 등록용 — 현재 DB 에 존재하는 모든 티커(= active). */
export async function getAllStockTickers(): Promise<string[]> {
  const db = getDb()
  const rows = await db.select({ ticker: companies.ticker }).from(companies)
  return rows.map((r) => r.ticker)
}
