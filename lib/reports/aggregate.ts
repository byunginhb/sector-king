/**
 * 월간/주간 마켓 리포트용 결정론적 집계 (SQLite `data/hegemony.db`).
 *
 * 신규 수집 없음 — 기존 누적 데이터를 룰 기반으로 집계한다. 모든 숫자는
 * 여기서 계산되며 LLM은 절대 관여하지 않는다(환각 차단). 산문은 lib/reports/prose.ts.
 *
 * 통화 정규화: 가격·시총성 필드는 네이티브 통화 저장 → 섹터/시장 합산 전 종목별
 * toUsd(value, ticker) 적용 후 합산 (혼합통화 scale 왜곡 방지, CLAUDE.md 규칙).
 * 비율(등락%·upside)은 같은 ticker 나눗셈이라 변환 불요.
 *
 * 분할/스테일 가드: raw 등락률(말가/초가)과 일간 price_change 복리누적을 둘 다
 * 계산해 |차이| > 25pp 이면 "data-suspect"로 movers/headlines에서 제외한다
 * (KLAC 7:1 분할 raw -84% 오발행 방지).
 */
import Database from 'better-sqlite3'
import { toUsd } from '../currency'

const MOVER_MIN_MCAP_USD = 2_000_000_000 // $2B — 마이크로캡 노이즈 컷
const SPLIT_DIVERGENCE_PP = 25 // raw vs 복리 등락 발산 임계(퍼센트포인트)
const THEME_MIN_MEMBERS = 3 // 섹터 점수추세 표본 최소 구성원
const KR_UPSIDE_BUY = 15 // buy → buy 유지 상방 임계(%)

export interface SectorFlow {
  name: string
  flowUsd: number // 기간 시총 변화액(USD)
  pct: number // 기간 변화율(%)
  members: number
}

export interface Mover {
  ticker: string
  code: string // .KS/.KQ 접미사 제거
  name: string
  region: 'KR' | 'INTL'
  pct: number // 월간 등락률(%)
  priceFirstUsd: number
  priceLastUsd: number
  mcapLastUsd: number
  volume: number
  scoreDelta: number
  sectorName: string | null
}

export interface ThemeSector {
  name: string
  scoreDelta: number
  members: number
}

export type KrOpinion = 'buy' | 'buy_selective' | 'neutral' | 'reduce'

export interface KrStock {
  code: string
  name: string
  pct: number
  mcapLastUsd: number
  recommendationKey: string | null
  analystCount: number | null
  upsidePct: number | null
  opinion: KrOpinion
}

export interface MonthlyFacts {
  periodStart: string
  periodEnd: string
  tradingDays: number
  marketFirstUsd: number
  marketLastUsd: number
  marketPct: number
  breadthUp: number
  breadthDown: number
  inflows: SectorFlow[]
  outflows: SectorFlow[]
  gainers: Mover[]
  losers: Mover[]
  themeUp: ThemeSector[]
  themeDown: ThemeSector[]
  krStocks: KrStock[]
}

interface TickerAgg {
  ticker: string
  firstDate: string
  lastDate: string
  priceFirst: number
  priceLast: number
  mcapFirst: number
  mcapLast: number
  volume: number
  distinctDays: number
  compReturn: number // 일간 price_change 복리누적(%)
}

function stripSuffix(ticker: string): string {
  return ticker.replace(/\.(KS|KQ|T|TW|HK|PA)$/, '')
}

/** 구간 내 종목별 스냅샷을 접어 per-ticker 집계로 만든다(per-ticker MIN/MAX). */
function aggregateSnapshots(
  rows: Array<{
    ticker: string
    date: string
    price: number | null
    price_change: number | null
    market_cap: number | null
    volume: number | null
  }>
): Map<string, TickerAgg> {
  const byTicker = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byTicker.get(r.ticker)
    if (list) list.push(r)
    else byTicker.set(r.ticker, [r])
  }

  const result = new Map<string, TickerAgg>()
  for (const [ticker, list] of byTicker) {
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1))
    const dates = new Set(sorted.map((r) => r.date))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    if (
      first.price == null ||
      last.price == null ||
      first.market_cap == null ||
      last.market_cap == null
    ) {
      continue
    }
    // 복리누적: Π(1 + pc/100) − 1. pc가 -100 이하(가격 0)면 스킵 방어.
    let comp = 1
    for (const r of sorted) {
      const pc = r.price_change
      if (pc != null && pc > -100) comp *= 1 + pc / 100
    }
    result.set(ticker, {
      ticker,
      firstDate: first.date,
      lastDate: last.date,
      priceFirst: first.price,
      priceLast: last.price,
      mcapFirst: first.market_cap,
      mcapLast: last.market_cap,
      volume: sorted.reduce((s, r) => s + (r.volume ?? 0), 0),
      distinctDays: dates.size,
      compReturn: (comp - 1) * 100,
    })
  }
  return result
}

/**
 * 분할/스테일 데이터 의심 판정. raw 등락(말가/초가)과 일간 price_change 복리누적이
 * 25pp 넘게 발산하면 true → movers/headlines 에서 제외.
 */
export function isDataSuspect(rawRet: number, compReturn: number): boolean {
  return Math.abs(rawRet - compReturn) > SPLIT_DIVERGENCE_PP
}

export function classifyOpinion(
  recommendationKey: string | null,
  upsidePct: number | null,
  pct: number
): KrOpinion {
  const rec = recommendationKey ?? 'none'
  if (rec === 'underperform' || rec === 'sell') return 'reduce'
  if (rec === 'hold' || rec === 'none') return 'neutral'
  // buy / strong_buy
  if (rec === 'strong_buy') return 'buy'
  // rec === 'buy'
  // 낙폭 크고 상방 여지 크면 선별 매수
  if (pct <= -20 && upsidePct != null && upsidePct >= 30) return 'buy_selective'
  if (upsidePct != null && upsidePct < KR_UPSIDE_BUY) return 'buy_selective'
  return 'buy'
}

export function aggregateMonthly(
  dbPath: string,
  periodStart: string,
  periodEnd: string
): MonthlyFacts {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const snapshots = db
      .prepare(
        `SELECT ticker, date, price, price_change, market_cap, volume
         FROM daily_snapshots WHERE date BETWEEN ? AND ?`
      )
      .all(periodStart, periodEnd) as Array<{
      ticker: string
      date: string
      price: number | null
      price_change: number | null
      market_cap: number | null
      volume: number | null
    }>

    const agg = aggregateSnapshots(snapshots)

    // 거래일 수 = 구간 내 distinct date
    const tradingDays = new Set(snapshots.map((r) => r.date)).size

    // 회사 메타
    const companyRows = db
      .prepare(`SELECT ticker, name, name_ko, region FROM companies`)
      .all() as Array<{
      ticker: string
      name: string
      name_ko: string | null
      region: string
    }>
    const company = new Map(companyRows.map((c) => [c.ticker, c]))

    // 컨센서스
    const scoreRows = db
      .prepare(
        `SELECT ticker, recommendation_key, analyst_count, target_mean_price
         FROM company_scores`
      )
      .all() as Array<{
      ticker: string
      recommendation_key: string | null
      analyst_count: number | null
      target_mean_price: number | null
    }>
    const consensus = new Map(scoreRows.map((s) => [s.ticker, s]))

    // 섹터 구성원
    const secRows = db
      .prepare(
        `SELECT sc.ticker AS ticker, s.id AS sector_id, s.name AS sector_name
         FROM sector_companies sc JOIN sectors s ON s.id = sc.sector_id`
      )
      .all() as Array<{ ticker: string; sector_id: number; sector_name: string }>
    const sectorMembers = new Map<number, { name: string; tickers: string[] }>()
    const tickerPrimarySector = new Map<string, string>()
    for (const r of secRows) {
      const entry = sectorMembers.get(r.sector_id)
      if (entry) entry.tickers.push(r.ticker)
      else sectorMembers.set(r.sector_id, { name: r.sector_name, tickers: [r.ticker] })
      if (!tickerPrimarySector.has(r.ticker))
        tickerPrimarySector.set(r.ticker, r.sector_name)
    }

    // score_history 6월 경계(per-ticker MIN/MAX)
    const scoreHist = db
      .prepare(
        `SELECT ticker, date, smoothed_score FROM score_history
         WHERE date BETWEEN ? AND ?`
      )
      .all(periodStart, periodEnd) as Array<{
      ticker: string
      date: string
      smoothed_score: number | null
    }>
    const scoreByTicker = new Map<string, { first: number; last: number }>()
    {
      const grouped = new Map<string, typeof scoreHist>()
      for (const r of scoreHist) {
        const list = grouped.get(r.ticker)
        if (list) list.push(r)
        else grouped.set(r.ticker, [r])
      }
      for (const [ticker, list] of grouped) {
        const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1))
        const f = sorted[0].smoothed_score
        const l = sorted[sorted.length - 1].smoothed_score
        if (f != null && l != null) scoreByTicker.set(ticker, { first: f, last: l })
      }
    }
    const scoreDeltaOf = (t: string): number => {
      const s = scoreByTicker.get(t)
      return s ? s.last - s.first : 0
    }

    // ── 섹터 자금흐름 (USD, 종목별 toUsd 후 합산) ────────────────────
    const flows: SectorFlow[] = []
    for (const { name, tickers } of sectorMembers.values()) {
      let first = 0
      let last = 0
      let members = 0
      for (const t of tickers) {
        const a = agg.get(t)
        if (!a) continue
        first += toUsd(a.mcapFirst, t)
        last += toUsd(a.mcapLast, t)
        members++
      }
      if (members === 0 || first <= 0) continue
      flows.push({
        name,
        flowUsd: last - first,
        pct: ((last - first) / first) * 100,
        members,
      })
    }
    const inflows = flows
      .filter((f) => f.flowUsd > 0)
      .sort((a, b) => b.flowUsd - a.flowUsd)
      .slice(0, 5)
    const outflows = flows
      .filter((f) => f.flowUsd < 0)
      .sort((a, b) => a.flowUsd - b.flowUsd)
      .slice(0, 5)

    // ── Top movers (분할 가드 적용) ─────────────────────────────────
    const movers: Mover[] = []
    let breadthUp = 0
    let breadthDown = 0
    for (const a of agg.values()) {
      if (a.distinctDays < 2) continue // 등락 계산 불가(신규 상장 등)
      const mcapLastUsd = toUsd(a.mcapLast, a.ticker)
      if (mcapLastUsd < MOVER_MIN_MCAP_USD) continue
      const rawRet = ((a.priceLast - a.priceFirst) / a.priceFirst) * 100
      // 분할/스테일 가드: raw vs 복리 발산 시 제외
      if (isDataSuspect(rawRet, a.compReturn)) continue
      const c = company.get(a.ticker)
      const region = (c?.region === 'KR' ? 'KR' : 'INTL') as 'KR' | 'INTL'
      movers.push({
        ticker: a.ticker,
        code: stripSuffix(a.ticker),
        name: c?.name_ko || c?.name || a.ticker,
        region,
        pct: rawRet,
        priceFirstUsd: toUsd(a.priceFirst, a.ticker),
        priceLastUsd: toUsd(a.priceLast, a.ticker),
        mcapLastUsd,
        volume: a.volume,
        scoreDelta: scoreDeltaOf(a.ticker),
        sectorName: tickerPrimarySector.get(a.ticker) ?? null,
      })
      if (rawRet > 0) breadthUp++
      else if (rawRet < 0) breadthDown++
    }
    const gainers = [...movers].sort((a, b) => b.pct - a.pct).slice(0, 8)
    const losers = [...movers].sort((a, b) => a.pct - b.pct).slice(0, 8)

    // ── 섹터 점수추세(themeFlows용) ────────────────────────────────
    const themes: ThemeSector[] = []
    for (const { name, tickers } of sectorMembers.values()) {
      const deltas: number[] = []
      for (const t of tickers) {
        const s = scoreByTicker.get(t)
        if (s) deltas.push(s.last - s.first)
      }
      if (deltas.length < THEME_MIN_MEMBERS) continue
      const avg = deltas.reduce((x, y) => x + y, 0) / deltas.length
      themes.push({ name, scoreDelta: avg, members: deltas.length })
    }
    const themeUp = [...themes].sort((a, b) => b.scoreDelta - a.scoreDelta).slice(0, 4)
    const themeDown = [...themes].sort((a, b) => a.scoreDelta - b.scoreDelta).slice(0, 4)

    // ── KR 상위 종목 + 컨센서스 ────────────────────────────────────
    const krCandidates: KrStock[] = []
    for (const a of agg.values()) {
      if (a.distinctDays < 2) continue
      const c = company.get(a.ticker)
      if (c?.region !== 'KR') continue
      const pct = ((a.priceLast - a.priceFirst) / a.priceFirst) * 100
      const cs = consensus.get(a.ticker)
      const priceLastUsd = toUsd(a.priceLast, a.ticker)
      const targetUsd =
        cs?.target_mean_price != null ? toUsd(cs.target_mean_price, a.ticker) : null
      const upsidePct =
        targetUsd != null && priceLastUsd > 0
          ? ((targetUsd - priceLastUsd) / priceLastUsd) * 100
          : null
      krCandidates.push({
        code: stripSuffix(a.ticker),
        name: c.name_ko || c.name || a.ticker,
        pct,
        mcapLastUsd: toUsd(a.mcapLast, a.ticker),
        recommendationKey: cs?.recommendation_key ?? null,
        analystCount: cs?.analyst_count ?? null,
        upsidePct,
        opinion: classifyOpinion(cs?.recommendation_key ?? null, upsidePct, pct),
      })
    }
    const krStocks = krCandidates
      .sort((a, b) => b.mcapLastUsd - a.mcapLastUsd)
      .slice(0, 8)

    // ── 시장 전체(dedup distinct ticker) ───────────────────────────
    let marketFirst = 0
    let marketLast = 0
    for (const a of agg.values()) {
      marketFirst += toUsd(a.mcapFirst, a.ticker)
      marketLast += toUsd(a.mcapLast, a.ticker)
    }

    return {
      periodStart,
      periodEnd,
      tradingDays,
      marketFirstUsd: marketFirst,
      marketLastUsd: marketLast,
      marketPct: marketFirst > 0 ? ((marketLast - marketFirst) / marketFirst) * 100 : 0,
      breadthUp,
      breadthDown,
      inflows,
      outflows,
      gainers,
      losers,
      themeUp,
      themeDown,
      krStocks,
    }
  } finally {
    db.close()
  }
}
