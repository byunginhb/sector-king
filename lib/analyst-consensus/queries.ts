/**
 * 애널리스트 성적표 읽기 — Supabase(리포트) + SQLite(주가) 크로스-스토어 조인·집계.
 *
 * 통화: 목표가/주가는 KRW 네이티브 저장 → 응답 직전 toUsd(value, ticker)(프로젝트 필수 규칙).
 *       방향 적중/달성률은 통화 무관이라 raw 로 계산.
 * 서버 전용(getDb/better-sqlite3, admin client).
 */
import { and, inArray, isNotNull, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { dailySnapshots } from '@/drizzle/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { toUsd } from '@/lib/currency'
import { kstToday } from './dates'
import {
  makePriceResolver,
  scoreSeries,
  summarize,
  achievementRate,
  predictionScore,
  type PricePoint,
  type ReportPoint,
} from './accuracy'
import type {
  AnalystLeaderboardResponse,
  AnalystLeaderboardRow,
  AnalystDetailResponse,
  AnalystTickerSeries,
  AnalystStockListResponse,
  AnalystStockListItem,
  AnalystStockDetailResponse,
  StockAnalystSeries,
} from '@/types'

const num = (v: unknown): number | null => (v == null ? null : Number(v))

interface ReportRow {
  id: number
  ticker: string
  report_date: string
  target_price: string | number | null
}

/** PostgREST 1000행 상한 → range 페이지네이션으로 전량 수집. */
async function pageAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const PAGE = 1000
  let from = 0
  const out: T[] = []
  for (;;) {
    const { data, error } = await make(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
    from += PAGE
  }
  return out
}

/** 주어진 티커들의 (date, price) 시계열(raw KRW). */
function loadPriceSeries(tickers: string[]): Map<string, PricePoint[]> {
  const map = new Map<string, PricePoint[]>()
  if (tickers.length === 0) return map
  const rows = getDb()
    .select({ ticker: dailySnapshots.ticker, date: dailySnapshots.date, price: dailySnapshots.price })
    .from(dailySnapshots)
    .where(and(inArray(dailySnapshots.ticker, tickers), isNotNull(dailySnapshots.price)))
    .all()
  for (const r of rows) {
    if (r.ticker == null || r.price == null) continue
    const arr = map.get(r.ticker) ?? []
    arr.push({ date: r.date, price: r.price })
    map.set(r.ticker, arr)
  }
  return map
}

/** GET /api/analysts — 방향 적중률 랭킹. */
export async function getLeaderboard(): Promise<AnalystLeaderboardResponse> {
  const supabase = createAdminClient()
  const today = kstToday()

  const [reports, authors, analysts] = await Promise.all([
    pageAll<ReportRow>((f, t) =>
      supabase
        .from('analyst_reports')
        .select('id,ticker,report_date,target_price')
        .eq('matched', true)
        .not('target_price', 'is', null)
        .range(f, t)
    ),
    pageAll<{ report_id: number; analyst_id: number }>((f, t) =>
      supabase.from('report_authors').select('report_id,analyst_id').range(f, t)
    ),
    pageAll<{ id: number; name: string; firm: string }>((f, t) =>
      supabase.from('analysts').select('id,name,firm').range(f, t)
    ),
  ])

  const reportById = new Map(reports.map((r) => [r.id, r]))
  const analystById = new Map(analysts.map((a) => [a.id, a]))
  const prices = loadPriceSeries([...new Set(reports.map((r) => r.ticker))])

  // analystId → ticker → ReportPoint[]
  const perAnalyst = new Map<number, Map<string, ReportPoint[]>>()
  for (const link of authors) {
    const rep = reportById.get(link.report_id)
    if (!rep) continue
    const target = num(rep.target_price)
    if (target == null || target <= 0) continue
    let byTicker = perAnalyst.get(link.analyst_id)
    if (!byTicker) perAnalyst.set(link.analyst_id, (byTicker = new Map()))
    const arr = byTicker.get(rep.ticker) ?? []
    arr.push({ date: rep.report_date, target })
    byTicker.set(rep.ticker, arr)
  }

  const rows: AnalystLeaderboardRow[] = []
  for (const [analystId, byTicker] of perAnalyst) {
    const a = analystById.get(analystId)
    if (!a) continue
    let hits = 0
    let scored = 0
    let reportCount = 0
    for (const [ticker, series] of byTicker) {
      reportCount += series.length
      const resolver = makePriceResolver(prices.get(ticker) ?? [])
      const s = summarize(scoreSeries(series, resolver, today))
      hits += s.hits
      scored += s.scored
    }
    rows.push({
      analystId,
      name: a.name,
      firm: a.firm,
      score: predictionScore(hits, scored) ?? 0,
      hitRate: scored === 0 ? null : hits / scored,
      scored,
      hits,
      tickersCovered: byTicker.size,
      reportCount,
    })
  }

  // 채점 표본이 있는 애널만 단일 랭킹(예측력 점수 내림차순). Wilson 하한이 소표본을 자연 벌점.
  const ranked = rows
    .filter((r) => r.scored >= 1)
    .sort((a, b) => b.score - a.score || b.scored - a.scored)

  // 리포트 최다 랭킹 — 채점 표본이 아직 없는 애널(전량 유지·신규)도 포함해야 "가장 많이 쓴 순"이 맞다.
  const byReports = [...rows].sort((a, b) => b.reportCount - a.reportCount || b.score - a.score)

  return { ranked, byReports }
}

/** GET /api/analysts/[id] — 애널리스트 상세(종목별 목표가 vs 실제 + 겹쳐보기). null=없음. */
export async function getAnalystDetail(analystId: number): Promise<AnalystDetailResponse | null> {
  const supabase = createAdminClient()
  const today = kstToday()

  const { data: analyst, error: aErr } = await supabase
    .from('analysts')
    .select('id,name,firm')
    .eq('id', analystId)
    .maybeSingle()
  if (aErr) throw new Error(aErr.message)
  if (!analyst) return null

  // 이 애널리스트가 저자인 리포트 id
  const myLinks = await pageAll<{ report_id: number }>((f, t) =>
    supabase.from('report_authors').select('report_id').eq('analyst_id', analystId).range(f, t)
  )
  const myReportIds = [...new Set(myLinks.map((l) => l.report_id))]
  if (myReportIds.length === 0) {
    return { analystId, name: analyst.name, firm: analyst.firm, hitRate: null, scored: 0, hits: 0, reportCount: 0, tickers: [] }
  }

  // 내 매칭·목표가 리포트 → 커버 종목
  const myReports = await pageAll<ReportRow & { business_name: string; grade_value: string | null; report_title: string | null; pdf_url: string | null; thumbnail_url: string | null }>(
    (f, t) =>
      supabase
        .from('analyst_reports')
        .select('id,ticker,report_date,target_price,business_name,grade_value,report_title,pdf_url,thumbnail_url')
        .in('id', myReportIds)
        .eq('matched', true)
        .not('target_price', 'is', null)
        .range(f, t)
  )
  const tickers = [...new Set(myReports.map((r) => r.ticker))]
  if (tickers.length === 0) {
    return { analystId, name: analyst.name, firm: analyst.firm, hitRate: null, scored: 0, hits: 0, reportCount: 0, tickers: [] }
  }

  // 같은 종목의 모든 애널리스트 리포트(겹쳐보기용)
  const tickerReports = await pageAll<ReportRow>((f, t) =>
    supabase
      .from('analyst_reports')
      .select('id,ticker,report_date,target_price')
      .in('ticker', tickers)
      .eq('matched', true)
      .not('target_price', 'is', null)
      .range(f, t)
  )
  const trAuthors = await pageAll<{ report_id: number; analyst_id: number }>((f, t) =>
    supabase.from('report_authors').select('report_id,analyst_id').in('report_id', tickerReports.map((r) => r.id)).range(f, t)
  )
  const otherAnalystIds = [...new Set(trAuthors.map((a) => a.analyst_id))]
  const otherAnalysts = await pageAll<{ id: number; name: string; firm: string }>((f, t) =>
    supabase.from('analysts').select('id,name,firm').in('id', otherAnalystIds).range(f, t)
  )
  const otherById = new Map(otherAnalysts.map((a) => [a.id, a]))
  const trById = new Map(tickerReports.map((r) => [r.id, r]))
  // analystId → ticker → points
  const overlay = new Map<number, Map<string, { date: string; target: number }[]>>()
  for (const link of trAuthors) {
    const rep = trById.get(link.report_id)
    if (!rep) continue
    const target = num(rep.target_price)
    if (target == null || target <= 0) continue
    let byT = overlay.get(link.analyst_id)
    if (!byT) overlay.set(link.analyst_id, (byT = new Map()))
    const arr = byT.get(rep.ticker) ?? []
    arr.push({ date: rep.report_date, target: toUsd(target, rep.ticker) })
    byT.set(rep.ticker, arr)
  }

  const prices = loadPriceSeries(tickers)

  const seriesOut: AnalystTickerSeries[] = []
  let overallHits = 0
  let overallScored = 0
  for (const ticker of tickers) {
    const mine = myReports
      .filter((r) => r.ticker === ticker)
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
    const points: ReportPoint[] = mine.map((r) => ({ date: r.report_date, target: num(r.target_price)! }))
    const resolver = makePriceResolver(prices.get(ticker) ?? [])
    const preds = scoreSeries(points, resolver, today)
    const s = summarize(preds)
    overallHits += s.hits
    overallScored += s.scored

    const priceSeries = (prices.get(ticker) ?? []).sort((a, b) => a.date.localeCompare(b.date))
    const currentPrice = priceSeries.length ? priceSeries[priceSeries.length - 1].price : null
    const lastMine = mine[mine.length - 1]
    const lastTargetRaw = num(lastMine.target_price)!
    const lastAch = achievementRate(resolver(lastMine.report_date), currentPrice, lastTargetRaw)

    seriesOut.push({
      ticker,
      businessName: mine[0].business_name,
      hitRate: s.hitRate,
      scored: s.scored,
      latestTarget: toUsd(lastTargetRaw, ticker),
      latestAchievement: lastAch,
      targets: mine.map((r, i) => ({
        date: r.report_date,
        target: toUsd(num(r.target_price)!, ticker),
        direction: preds[i].direction,
        status: preds[i].status,
        actualReturn: preds[i].actualReturn,
        inProgress: preds[i].inProgress,
        grade: r.grade_value,
        reportTitle: r.report_title,
        pdfUrl: r.pdf_url,
        thumbnailUrl: r.thumbnail_url,
      })),
      prices: priceSeries.map((p) => ({ date: p.date, price: toUsd(p.price, ticker) })),
      others: [...(overlay.entries())]
        .filter(([aid]) => aid !== analystId)
        .map(([aid, byT]) => {
          const pts = byT.get(ticker)
          const info = otherById.get(aid)
          if (!pts || !info) return null
          return { analystId: aid, name: info.name, firm: info.firm, points: pts.sort((a, b) => a.date.localeCompare(b.date)) }
        })
        .filter((v): v is NonNullable<typeof v> => v !== null),
    })
  }

  // 커버 종목 많은 순
  seriesOut.sort((a, b) => b.targets.length - a.targets.length)

  return {
    analystId,
    name: analyst.name,
    firm: analyst.firm,
    hitRate: overallScored === 0 ? null : overallHits / overallScored,
    scored: overallScored,
    hits: overallHits,
    reportCount: myReports.length,
    tickers: seriesOut,
  }
}

/** 티커별 최신 종가(raw KRW). 목록용(전체 시계열 불필요). */
function loadLatestPrices(tickers: string[]): Map<string, number> {
  const map = new Map<string, number>()
  if (tickers.length === 0) return map
  // IN 필터를 서브쿼리 안으로 — max(date) 스캔이 전체 티커가 아니라 요청분만 대상.
  const inList = sql.join(tickers.map((x) => sql`${x}`), sql`, `)
  const rows = getDb().all<{ ticker: string; price: number }>(sql`
    select t.ticker as ticker, t.price as price
    from daily_snapshots t
    join (
      select ticker, max(date) as md from daily_snapshots
      where price is not null and ticker in (${inList})
      group by ticker
    ) m on t.ticker = m.ticker and t.date = m.md
  `)
  for (const r of rows) if (r.price != null) map.set(r.ticker, r.price)
  return map
}

interface StockReportRow extends ReportRow {
  business_name: string
}

/** GET /api/analysts/stocks — 커버 종목 목록(예측 애널 수 순). */
export async function getStockList(): Promise<AnalystStockListResponse> {
  const supabase = createAdminClient()

  const [reports, authors] = await Promise.all([
    pageAll<StockReportRow>((f, t) =>
      supabase
        .from('analyst_reports')
        .select('id,ticker,report_date,target_price,business_name')
        .eq('matched', true)
        .not('target_price', 'is', null)
        .range(f, t)
    ),
    pageAll<{ report_id: number; analyst_id: number }>((f, t) =>
      supabase.from('report_authors').select('report_id,analyst_id').range(f, t)
    ),
  ])

  const authorsByReport = new Map<number, number[]>()
  for (const a of authors) {
    const arr = authorsByReport.get(a.report_id) ?? []
    arr.push(a.analyst_id)
    authorsByReport.set(a.report_id, arr)
  }

  // ticker → 집계
  interface Acc {
    businessName: string
    reportCount: number
    analysts: Set<number>
    // analystId → 최신(리포트일 최대) target(raw)
    latestTargetByAnalyst: Map<number, { date: string; target: number }>
  }
  const byTicker = new Map<string, Acc>()
  for (const r of reports) {
    const target = num(r.target_price)
    if (target == null || target <= 0) continue
    let acc = byTicker.get(r.ticker)
    if (!acc) {
      acc = { businessName: r.business_name, reportCount: 0, analysts: new Set(), latestTargetByAnalyst: new Map() }
      byTicker.set(r.ticker, acc)
    }
    acc.reportCount += 1
    for (const analystId of authorsByReport.get(r.id) ?? []) {
      acc.analysts.add(analystId)
      const prev = acc.latestTargetByAnalyst.get(analystId)
      if (!prev || r.report_date > prev.date) {
        acc.latestTargetByAnalyst.set(analystId, { date: r.report_date, target })
      }
    }
  }

  const latestPrices = loadLatestPrices([...byTicker.keys()])

  const stocks: AnalystStockListItem[] = [...byTicker.entries()].map(([ticker, acc]) => {
    // 컨센서스 = 애널별 최신 목표가의 중앙값(상세 뷰 consensusMedian 과 정의 일치, 이상치 방어).
    const latestTargets = [...acc.latestTargetByAnalyst.values()].map((v) => v.target).sort((a, b) => a - b)
    const n = latestTargets.length
    const consensusRaw =
      n === 0 ? null : n % 2 ? latestTargets[(n - 1) / 2] : (latestTargets[n / 2 - 1] + latestTargets[n / 2]) / 2
    const rawPrice = latestPrices.get(ticker) ?? null
    return {
      ticker,
      businessName: acc.businessName,
      analystCount: acc.analysts.size,
      reportCount: acc.reportCount,
      latestPrice: rawPrice == null ? null : toUsd(rawPrice, ticker),
      consensusTarget: consensusRaw == null ? null : toUsd(consensusRaw, ticker),
    }
  })

  // 예측 애널 많은 순 → 비교 재미있는 종목 상단
  stocks.sort((a, b) => b.analystCount - a.analystCount || b.reportCount - a.reportCount)
  return { stocks }
}

/** GET /api/analysts/stocks/[ticker] — 그 종목을 예측한 애널리스트들 비교. null=없음. */
export async function getStockDetail(ticker: string): Promise<AnalystStockDetailResponse | null> {
  const supabase = createAdminClient()
  const today = kstToday()

  const reports = await pageAll<StockReportRow>((f, t) =>
    supabase
      .from('analyst_reports')
      .select('id,ticker,report_date,target_price,business_name')
      .eq('ticker', ticker)
      .eq('matched', true)
      .not('target_price', 'is', null)
      .range(f, t)
  )
  if (reports.length === 0) return null

  const authors = await pageAll<{ report_id: number; analyst_id: number }>((f, t) =>
    supabase.from('report_authors').select('report_id,analyst_id').in('report_id', reports.map((r) => r.id)).range(f, t)
  )
  const analystIds = [...new Set(authors.map((a) => a.analyst_id))]
  const analystRows = await pageAll<{ id: number; name: string; firm: string }>((f, t) =>
    supabase.from('analysts').select('id,name,firm').in('id', analystIds).range(f, t)
  )
  const analystById = new Map(analystRows.map((a) => [a.id, a]))
  const reportById = new Map(reports.map((r) => [r.id, r]))

  // analystId → ReportPoint[]
  const byAnalyst = new Map<number, ReportPoint[]>()
  for (const link of authors) {
    const rep = reportById.get(link.report_id)
    if (!rep) continue
    const target = num(rep.target_price)
    if (target == null || target <= 0) continue
    const arr = byAnalyst.get(link.analyst_id) ?? []
    arr.push({ date: rep.report_date, target })
    byAnalyst.set(link.analyst_id, arr)
  }

  const priceSeries = (loadPriceSeries([ticker]).get(ticker) ?? []).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  const resolver = makePriceResolver(priceSeries)

  const analysts: StockAnalystSeries[] = []
  for (const [analystId, points] of byAnalyst) {
    const info = analystById.get(analystId)
    if (!info) continue
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
    const s = summarize(scoreSeries(sorted, resolver, today))
    analysts.push({
      analystId,
      name: info.name,
      firm: info.firm,
      score: predictionScore(s.hits, s.scored),
      hitRate: s.hitRate,
      scored: s.scored,
      hits: s.hits,
      misses: s.misses,
      reportCount: sorted.length,
      latestTarget: toUsd(sorted[sorted.length - 1].target, ticker),
      points: sorted.map((p) => ({ date: p.date, target: toUsd(p.target, ticker) })),
    })
  }
  // 예측력 점수 높은 순 → 상위 5명이 기본 노출(소표본 100%가 위로 오지 않도록 raw 적중률 대신 점수 기준).
  // 채점 표본 없는(전량 유지·신규) 애널은 점수 null → 리포트 수로 뒤에 정렬.
  analysts.sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.reportCount - a.reportCount
  )

  return {
    ticker,
    businessName: reports[0].business_name,
    latestPrice: priceSeries.length ? toUsd(priceSeries[priceSeries.length - 1].price, ticker) : null,
    prices: priceSeries.map((p) => ({ date: p.date, price: toUsd(p.price, ticker) })),
    analysts,
  }
}
