/**
 * 글로벌 자금 지도 계산 — 순수 함수(DB·네트워크 무관). server.ts 가 시계열을 넣어 호출한다.
 *
 * 세 층을 섞지 않는다 (docs/wiki/concepts/money-flow-definitions.md):
 *   ① 조류     liquidity  — 연준 순유동성
 *   ② 가치 변화 assets     — 규모 × 수익률. 자산 간 "이동액"이 아니다
 *   ③ 실제 통로 channels   — 스테이블코인·MMF·ETF 순설정·고객예탁금·외국인 순매수
 */

import { getKrwRate } from '@/lib/currency'
import {
  ASSETS,
  CALENDAR_SYMBOL,
  ETF_ASSET,
  PERIODS,
  PERIOD_DAYS,
  PERIOD_LABEL,
  RULERS,
  type AssetDef,
  type AssetGroup,
  type Period,
  type RiskSide,
} from './assets'
import { computeRrg, type Quadrant, type RrgPoint } from './rrg'
import {
  changeOver,
  last,
  shiftDate,
  sumBetween,
  toUsdSeries,
  valueAt,
  weeklyDates,
  type Pt,
} from './series'

// ─── 판정 임계값 ─────────────────────────────────────────────────
// 2024-10~2026-10 주간 끝날짜 102개로 기간별 |값| 분포를 재서 33번째 백분위수 근처로 잡았다
// → 평상시 3번 중 1번 꼴로 "중립/횡보"가 나온다. 값을 바꾸면 docs/wiki 결정 로그에 남길 것.
//   위험 선호 p33(%p): 1w 0.80 · 1m 2.77 · 3m 5.53 · 1y 7.45
//   순유동성 p33(%):   1w 0.35 · 1m 1.17 · 3m 1.22 · 1y 1.84
//   달러 인덱스 p33(%): 1w 0.32 · 1m 0.96 · 3m 0.97 · 1y 2.80

/** 위험 선호 점수(%p) = 위험 자산 평균 수익률 − 안전 자산 평균 수익률 */
export const RISK_THRESHOLD_PP: Record<Period, number> = {
  '1w': 1,
  '1m': 3,
  '3m': 5.5,
  '1y': 7.5,
}
/** 순유동성 변화율(%) */
export const LIQUIDITY_THRESHOLD_PCT: Record<Period, number> = {
  '1w': 0.35,
  '1m': 1.2,
  '3m': 1.2,
  '1y': 2,
}
/** 달러 인덱스 변화율(%) */
export const DOLLAR_THRESHOLD_PCT: Record<Period, number> = {
  '1w': 0.3,
  '1m': 1,
  '3m': 1,
  '1y': 2.8,
}

export type Direction = 'up' | 'down' | 'flat'

export interface AssetRow {
  id: string
  name: string
  group: AssetGroup
  risk: RiskSide
  returnPct: number | null
  /** 기간 끝 시점 추정 규모(USD). null = 가치 미집계 자산 */
  sizeUsd: number | null
  /** 기간 시가 가치 변화(USD) = 끝 규모 − 시작 규모 */
  valueChangeUsd: number | null
}

export interface Verdict {
  risk: 'on' | 'off' | 'neutral' | null
  riskScore: number | null
  liquidity: Direction | null
  dollar: Direction | null
  sentence: string
  leader: { name: string; returnPct: number } | null
  laggard: { name: string; returnPct: number } | null
}

export interface EtfFlow {
  assetId: string
  name: string
  flowUsd: number
}

export interface Channels {
  stablecoin: { latest: number; change: number | null; date: string } | null
  /** 리테일 MMF — 발표가 약 6주 늦어 자기 최신일 기준으로 변화를 잰다 */
  mmfRetail: { latest: number; change: number | null; date: string } | null
  /** observations = 기간 안에서 쓴 좌수 변화 관측 수(ETF 중 최대). 0 이면 아직 집계 불가 */
  etf: { flows: EtfFlow[]; observations: number; since: string } | null
  krDeposit: {
    latestUsd: number
    changeUsd: number | null
    date: string
  } | null
  krForeign: { netUsd: number; days: number; lastDate: string } | null
}

export interface PeriodView {
  period: Period
  startDate: string
  endDate: string
  assets: AssetRow[]
  verdict: Verdict
  liquidityChangeUsd: number | null
  rulers: { dxyPct: number | null; usdkrwPct: number | null }
  channels: Channels
}

export interface RrgAsset {
  id: string
  name: string
  group: AssetGroup
  tail: RrgPoint[]
  quadrant: Quadrant
}

export interface GlobalFlowPayload {
  asOf: string
  periods: Record<Period, PeriodView>
  rulerLevels: { dxy: number | null; usdkrw: number | null }
  liquidity: {
    series: Pt[]
    latest: Pt
    m2: { latest: number; yoyPct: number | null; date: string } | null
    mmfTotal: { latest: number; date: string } | null
  } | null
  rrg: RrgAsset[]
  sizeSources: { id: string; name: string; source: string }[]
}

export interface GlobalFlowInput {
  /** symbol → 종가 시계열(현지통화) */
  prices: Map<string, Pt[]>
  /** series_id → 시계열 */
  macro: Map<string, Pt[]>
}

const EMPTY: Pt[] = []

const scale = (v: number | null, k: number) => (v == null ? null : v * k)

// ─── ② 가치 변화 ────────────────────────────────────────────────

function usdPrices(asset: AssetDef, input: GlobalFlowInput): Pt[] {
  const raw = input.prices.get(asset.symbol) ?? EMPTY
  if (asset.currency === 'USD') return raw
  return toUsdSeries(raw, input.prices.get(RULERS.usdkrw.symbol) ?? EMPTY)
}

/** 기간 끝 시점의 자산군 규모(USD). 산출 근거가 없으면 null. */
export function sizeAtEnd(
  asset: AssetDef,
  usd: readonly Pt[],
  end: string,
  input: GlobalFlowInput,
): number | null {
  const size = asset.size
  const pEnd = valueAt(usd, end)
  if (!size || pEnd == null) return null
  if (size.kind === 'anchor') {
    const pAnchor = valueAt(usd, size.date)
    if (!pAnchor) return null // 이력이 기준일을 못 덮음 — 수집 기간(5y)을 확인
    let anchorUsd = size.value
    if (size.currency === 'KRW') {
      const fx = valueAt(input.prices.get(RULERS.usdkrw.symbol) ?? EMPTY, size.date)
      if (!fx) return null
      anchorUsd = size.value / fx
    }
    return anchorUsd * (pEnd / pAnchor)
  }
  if (size.kind === 'units') {
    const units =
      (size.seriesId && last(input.macro.get(size.seriesId) ?? EMPTY)?.value) || size.units
    return units * pEnd
  }
  const level = last(input.macro.get(size.seriesId) ?? EMPTY)
  return level ? level.value * size.scale : null
}

function assetRows(input: GlobalFlowInput, end: string, days: number): AssetRow[] {
  const start = shiftDate(end, -days)
  return ASSETS.map((a) => {
    const usd = usdPrices(a, input)
    const p0 = valueAt(usd, start)
    const p1 = valueAt(usd, end)
    const ret = p0 && p1 != null ? p1 / p0 - 1 : null
    const sizeUsd = sizeAtEnd(a, usd, end, input)
    return {
      id: a.id,
      name: a.name,
      group: a.group,
      risk: a.risk,
      returnPct: ret == null ? null : ret * 100,
      sizeUsd,
      // 끝 규모 × r/(1+r) = 끝 규모 − 시작 규모 (같은 수량·같은 기준점 가정)
      valueChangeUsd: sizeUsd != null && ret != null ? (sizeUsd * ret) / (1 + ret) : null,
    }
  })
}

// ─── 판정 ───────────────────────────────────────────────────────

function direction(value: number | null, threshold: number): Direction | null {
  if (value == null) return null
  if (value > threshold) return 'up'
  if (value < -threshold) return 'down'
  return 'flat'
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null)

export function riskScore(rows: readonly AssetRow[]): number | null {
  const pick = (side: RiskSide) =>
    rows.filter((r) => r.risk === side && r.returnPct != null).map((r) => r.returnPct as number)
  const risk = avg(pick('risk'))
  const safe = avg(pick('safe'))
  return risk == null || safe == null ? null : risk - safe
}

const RISK_TEXT = {
  on: '위험자산 선호',
  off: '안전자산 선호',
  neutral: '뚜렷한 쏠림 없음',
} as const
const LIQ_TEXT = {
  up: '유동성 확대',
  down: '유동성 축소',
  flat: '유동성 횡보',
} as const
const DOLLAR_TEXT = {
  up: '달러 강세',
  down: '달러 약세',
  flat: '달러 보합',
} as const

export function buildVerdict(
  period: Period,
  rows: readonly AssetRow[],
  liquidityPct: number | null,
  dxyPct: number | null,
): Verdict {
  const score = riskScore(rows)
  const riskDir = direction(score, RISK_THRESHOLD_PP[period])
  const risk =
    riskDir == null ? null : riskDir === 'up' ? 'on' : riskDir === 'down' ? 'off' : 'neutral'
  const liquidity = direction(liquidityPct, LIQUIDITY_THRESHOLD_PCT[period])
  const dollar = direction(dxyPct, DOLLAR_THRESHOLD_PCT[period])

  const ranked = rows
    .filter((r): r is AssetRow & { returnPct: number } => r.returnPct != null)
    .sort((a, b) => b.returnPct - a.returnPct)
  const pick = (r: (typeof ranked)[number] | undefined) =>
    r ? { name: r.name, returnPct: r.returnPct } : null

  const parts = [
    risk ? RISK_TEXT[risk] : null,
    liquidity ? LIQ_TEXT[liquidity] : null,
    dollar ? DOLLAR_TEXT[dollar] : null,
  ].filter(Boolean)

  return {
    risk,
    riskScore: score,
    liquidity,
    dollar,
    sentence: parts.length
      ? `최근 ${PERIOD_LABEL[period]}, ${parts.join(' · ')}`
      : '판정할 데이터가 부족합니다',
    leader: pick(ranked[0]),
    laggard: ranked.length > 1 ? pick(ranked[ranked.length - 1]) : null,
  }
}

// ─── ① 조류 ─────────────────────────────────────────────────────

/** 순유동성 = 연준 총자산 − TGA − 역레포. WALCL·WTREGEN 은 백만$, RRPONTSYD 는 십억$. */
export function netLiquidity(walcl: readonly Pt[], tga: readonly Pt[], rrp: readonly Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of walcl) {
    const t = valueAt(tga, p.date)
    if (t == null) continue
    const r = valueAt(rrp, p.date) ?? 0
    out.push({ date: p.date, value: (p.value - t) * 1e6 - r * 1e9 })
  }
  return out
}

// ─── ③ 실제 통로 ────────────────────────────────────────────────

/**
 * ETF 순설정 추정 = Σ (좌수_i − 좌수_{i−1}) × 좌당가치_i,  i ∈ (start, end].
 * 좌당가치 = AUM / 좌수 (수집값에 가격 시계열이 없는 ETF 도 계산되게).
 */
export function etfNetCreation(
  shares: readonly Pt[],
  aum: readonly Pt[],
  start: string,
  end: string,
) {
  let flow = 0
  let observations = 0
  for (let i = 1; i < shares.length; i++) {
    const cur = shares[i]
    if (cur.date <= start || cur.date > end) continue
    const a = valueAt(aum, cur.date)
    if (a == null || cur.value <= 0) continue
    flow += (cur.value - shares[i - 1].value) * (a / cur.value)
    observations += 1
  }
  return { flow, observations }
}

function channels(input: GlobalFlowInput, start: string, end: string, days: number): Channels {
  const m = (id: string) => input.macro.get(id) ?? EMPTY

  const stable = m('STABLECOIN_USD')
  const stableLast = last(stable)

  const mmf = m('FRED:WRMFNS')
  const mmfLast = last(mmf)

  const flowsByAsset = new Map<string, number>()
  let observations = 0
  let since: string | null = null
  for (const [etf, assetId] of Object.entries(ETF_ASSET)) {
    const shares = m(`ETF_SHARES:${etf}`)
    if (shares.length && (!since || shares[0].date < since)) since = shares[0].date
    const r = etfNetCreation(shares, m(`ETF_AUM:${etf}`), start, end)
    if (r.observations === 0) continue
    observations = Math.max(observations, r.observations)
    flowsByAsset.set(assetId, (flowsByAsset.get(assetId) ?? 0) + r.flow)
  }
  const nameOf = (id: string) => ASSETS.find((a) => a.id === id)?.name ?? id

  // 원화 금액은 서비스 표시 환율(toUsd 와 같은 SoT)로 환산 — ₩ 표시에서 원값이 그대로 돌아오게.
  // 시장 환율로 나누면 USD→₩ 표시(고정 환율)와 왕복이 어긋나 100.1조가 108조로 보인다(실측).
  const krw = getKrwRate()
  const deposit = m('KR_CUSTOMER_DEPOSIT')
  const depositLast = last(deposit)
  const foreign = m('KR_FOREIGN_NET')
  const foreignSum = sumBetween(foreign, start, end)

  return {
    stablecoin: stableLast
      ? {
          latest: stableLast.value,
          change: changeOver(stable, end, days),
          date: stableLast.date,
        }
      : null,
    mmfRetail: mmfLast
      ? {
          latest: mmfLast.value * 1e9,
          change: scale(changeOver(mmf, mmfLast.date, days), 1e9),
          date: mmfLast.date,
        }
      : null,
    // 수집은 시작됐지만 관측이 2회 미만이면 flows=[] — 화면이 "집계 중"을 띄운다.
    etf: since
      ? {
          flows: [...flowsByAsset]
            .map(([assetId, flowUsd]) => ({
              assetId,
              name: nameOf(assetId),
              flowUsd,
            }))
            .sort((a, b) => b.flowUsd - a.flowUsd),
          observations,
          since,
        }
      : null,
    krDeposit: depositLast
      ? {
          latestUsd: depositLast.value / krw,
          changeUsd: scale(changeOver(deposit, end, days), 1 / krw),
          date: depositLast.date,
        }
      : null,
    krForeign:
      foreignSum.count > 0
        ? {
            netUsd: foreignSum.sum / krw,
            days: foreignSum.count,
            lastDate: last(foreign)!.date,
          }
        : null,
  }
}

// ─── 조립 ───────────────────────────────────────────────────────

function pctChange(series: readonly Pt[], end: string, days: number): number | null {
  const a = valueAt(series, shiftDate(end, -days))
  const b = valueAt(series, end)
  return a && b != null ? (b / a - 1) * 100 : null
}

export function buildGlobalFlow(input: GlobalFlowInput): GlobalFlowPayload | null {
  const calendar = input.prices.get(CALENDAR_SYMBOL) ?? EMPTY
  const end = last(calendar)?.date
  if (!end) return null

  const dxy = input.prices.get(RULERS.dxy.symbol) ?? EMPTY
  const krw = input.prices.get(RULERS.usdkrw.symbol) ?? EMPTY
  const fx = valueAt(krw, end)

  const m = (id: string) => input.macro.get(id) ?? EMPTY
  const liq = netLiquidity(m('FRED:WALCL'), m('FRED:WTREGEN'), m('FRED:RRPONTSYD'))

  const periods = Object.fromEntries(
    PERIODS.map((period) => {
      const days = PERIOD_DAYS[period]
      const start = shiftDate(end, -days)
      const rows = assetRows(input, end, days)
      const dxyPct = pctChange(dxy, end, days)
      const view: PeriodView = {
        period,
        startDate: start,
        endDate: end,
        assets: rows,
        verdict: buildVerdict(period, rows, pctChange(liq, end, days), dxyPct),
        liquidityChangeUsd: changeOver(liq, end, days),
        rulers: { dxyPct, usdkrwPct: pctChange(krw, end, days) },
        channels: channels(input, start, end, days),
      }
      return [period, view]
    }),
  ) as Record<Period, PeriodView>

  const m2 = m('FRED:M2SL')
  const m2Last = last(m2)
  const mmfTotal = last(m('FRED:MMMFFAQ027S'))
  const liqLast = last(liq)

  const weeks = weeklyDates(calendar.map((p) => p.date))
  const rrg = computeRrg(
    ASSETS.map((a) => ({ id: a.id, usd: usdPrices(a, input) })),
    weeks,
  ).map((r) => {
    const a = ASSETS.find((x) => x.id === r.id)!
    return { ...r, name: a.name, group: a.group }
  })

  return {
    asOf: end,
    periods,
    rulerLevels: { dxy: valueAt(dxy, end), usdkrw: fx },
    liquidity: liqLast
      ? {
          series: liq.filter((p) => p.date >= shiftDate(liqLast.date, -365)),
          latest: liqLast,
          m2: m2Last
            ? {
                latest: m2Last.value * 1e9,
                yoyPct: pctChange(m2, m2Last.date, 365),
                date: m2Last.date,
              }
            : null,
          mmfTotal: mmfTotal ? { latest: mmfTotal.value * 1e6, date: mmfTotal.date } : null,
        }
      : null,
    rrg,
    sizeSources: ASSETS.filter((a) => a.size).map((a) => ({
      id: a.id,
      name: a.name,
      source: a.size!.source,
    })),
  }
}
