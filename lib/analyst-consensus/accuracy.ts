/**
 * 방향 예측 채점(순수 함수 — DB/통화 무지, 단위테스트 대상).
 *
 * 정의(설계 확정 Q2~Q4):
 *   - 방향 = 같은 (애널리스트, 종목)의 직전 리포트 목표가 대비 이번 목표가 상향/하향.
 *     · 첫 리포트(직전 없음) = 'new' (분모 제외)
 *     · 유지(동일) = 'hold' (분모 제외)
 *   - 채점 구간 = 발표일 → 같은 애널리스트·종목의 다음 리포트 발표일.
 *     마지막 리포트는 현재까지(진행중, inProgress=true).
 *   - 적중 = 예측 방향과 구간 내 실제 주가 변화 방향 일치.
 *   - 발표일가/종점가는 nearest 거래일(±5일)로 해석. 없으면 'unscorable'(분모 제외).
 *
 * 통화: 목표가/주가는 동일통화(KRW)이며 방향·달성률은 통화 무관. 표시용 변환은 상위(API)에서.
 */

export type Direction = 'up' | 'down' | 'hold' | 'new'
export type PredictionStatus = 'hit' | 'miss' | 'unscorable' | 'hold' | 'new'

export interface ReportPoint {
  /** 'YYYY-MM-DD' */
  date: string
  /** 목표주가(양수). null/0 리포트는 상위에서 제외하고 넘길 것. */
  target: number
}

export interface PricePoint {
  date: string
  price: number
}

export interface ScoredPrediction {
  date: string
  target: number
  prevTarget: number | null
  direction: Direction
  /** 채점 종점(다음 리포트일 또는 현재). */
  endDate: string | null
  priceStart: number | null
  priceEnd: number | null
  /** (priceEnd-priceStart)/priceStart, 채점 불가 시 null */
  actualReturn: number | null
  status: PredictionStatus
  /** 마지막(진행중) 예측인지 — 현재가까지 잠정 채점. */
  inProgress: boolean
}

const DAY = 24 * 60 * 60 * 1000

function toTime(d: string): number {
  return new Date(`${d}T00:00:00Z`).getTime()
}

/**
 * nearest 거래일 종가 해석기.
 * on-or-after(직후) 우선 → 없으면 on-or-before → 창(windowDays) 초과 시 null.
 * (설계 Q16: 발표일 휴장 시 직후 첫 거래일 우선)
 */
export function makePriceResolver(
  series: PricePoint[],
  windowDays = 5
): (date: string) => number | null {
  const sorted = [...series].sort((a, b) => toTime(a.date) - toTime(b.date))
  const exact = new Map(sorted.map((p) => [p.date, p.price]))
  return (date: string) => {
    if (exact.has(date)) return exact.get(date)!
    const t = toTime(date)
    const win = windowDays * DAY
    let after: PricePoint | null = null
    let before: PricePoint | null = null
    for (const p of sorted) {
      const pt = toTime(p.date)
      if (pt >= t && pt - t <= win) {
        after = p
        break
      }
    }
    if (after) return after.price
    for (let i = sorted.length - 1; i >= 0; i--) {
      const pt = toTime(sorted[i].date)
      if (pt <= t && t - pt <= win) {
        before = sorted[i]
        break
      }
    }
    return before ? before.price : null
  }
}

function classify(target: number, prev: number | null): Direction {
  if (prev == null) return 'new'
  if (target > prev) return 'up'
  if (target < prev) return 'down'
  return 'hold'
}

/**
 * 한 (애널리스트, 종목) 시계열을 채점.
 * @param reports 목표가 있는 리포트(날짜 오름차순 정렬 불필요 — 내부 정렬)
 * @param priceAt nearest 거래일 해석기
 * @param nowDate 진행중 예측의 종점(오늘, 'YYYY-MM-DD')
 */
export function scoreSeries(
  reports: ReportPoint[],
  priceAt: (date: string) => number | null,
  nowDate: string
): ScoredPrediction[] {
  const sorted = [...reports].sort((a, b) => toTime(a.date) - toTime(b.date))
  return sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1].target : null
    const direction = classify(r.target, prev)
    const isLast = i === sorted.length - 1
    const endDate = isLast ? nowDate : sorted[i + 1].date

    const base: Omit<ScoredPrediction, 'status'> = {
      date: r.date,
      target: r.target,
      prevTarget: prev,
      direction,
      endDate,
      priceStart: null,
      priceEnd: null,
      actualReturn: null,
      inProgress: isLast,
    }

    if (direction === 'new') return { ...base, status: 'new' }
    if (direction === 'hold') return { ...base, status: 'hold' }

    const priceStart = priceAt(r.date)
    const priceEnd = priceAt(endDate)
    if (priceStart == null || priceEnd == null || priceStart === 0) {
      return { ...base, priceStart, priceEnd, status: 'unscorable' }
    }
    const actualReturn = (priceEnd - priceStart) / priceStart
    const hit =
      (direction === 'up' && actualReturn > 0) || (direction === 'down' && actualReturn < 0)
    return {
      ...base,
      priceStart,
      priceEnd,
      actualReturn,
      status: hit ? 'hit' : 'miss',
    }
  })
}

export interface AccuracySummary {
  hits: number
  misses: number
  /** 채점된 예측 수 (hits+misses) — 랭킹 표본. */
  scored: number
  hitRate: number | null // scored===0 → null
}

/** 여러 시계열의 채점 결과를 합산해 적중률 요약. */
export function summarize(predictions: ScoredPrediction[]): AccuracySummary {
  let hits = 0
  let misses = 0
  for (const p of predictions) {
    if (p.status === 'hit') hits++
    else if (p.status === 'miss') misses++
  }
  const scored = hits + misses
  return { hits, misses, scored, hitRate: scored === 0 ? null : hits / scored }
}

/**
 * Wilson score 구간 하한(비율의 보수적 추정, [0,1]).
 * 표본이 적을수록 하한이 크게 낮아져 소표본 고적중률에 자연 벌점을 주고,
 * 표본이 쌓일수록 실제 적중률로 수렴한다(예측을 많이 한 애널리스트에 가중).
 * z=1.96 (95% 신뢰). scored===0 → null.
 */
export function wilsonLowerBound(hits: number, scored: number, z = 1.96): number | null {
  if (scored <= 0) return null
  const p = hits / scored
  const z2 = z * z
  const denom = 1 + z2 / scored
  const center = p + z2 / (2 * scored)
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * scored)) / scored)
  return Math.max(0, (center - margin) / denom)
}

/**
 * 예측력 점수(0~100 정수) = Wilson 하한 ×100.
 * 소표본 100%는 낮은 점수, 대표본 고적중률은 높은 점수로 랭킹된다.
 * scored===0 → null.
 */
export function predictionScore(hits: number, scored: number): number | null {
  const w = wilsonLowerBound(hits, scored)
  return w == null ? null : Math.round(w * 100)
}

/** 달성률: (현재가 − 발표일가) / (목표가 − 발표일가). 100%=목표 도달. 계산불가 null. */
export function achievementRate(
  priceAtReport: number | null,
  currentPrice: number | null,
  target: number
): number | null {
  if (priceAtReport == null || currentPrice == null) return null
  const denom = target - priceAtReport
  if (denom === 0) return null
  return (currentPrice - priceAtReport) / denom
}
