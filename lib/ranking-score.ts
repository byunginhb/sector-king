/**
 * 단기/장기 점수 단일 SoT (Single Source of Truth)
 *
 * 랭킹 페이지(`/api/rankings`)와 종목 상세(`/stock/[ticker]`)가 **같은 함수·같은 입력**으로
 * 점수를 계산해 두 화면에서 **동일한 숫자**를 보장한다(통합 기획서 §9.1).
 *
 * 설계 원칙
 * - 순수함수: 입력 → 출력 1:1, 부수효과 없음(SSR/CSR 동일 결과).
 * - 입력은 전부 기존 DB 필드의 원시값(가공 전). DB 컬럼 추가 0 · 마이그레이션 0.
 * - 통화: 상승여력 계산은 **USD 환산값**(priceUsd/targetUsd)을 받아 비율을 구한다.
 *   환산 책임은 호출부(API 응답 직전 toUsd). 이 모듈은 통화를 모른다.
 * - null 컴포넌트는 가중치 재배분(graceful degrade) — 행을 제외하지 않는다.
 *
 * 점수 공식은 `data-model.md §2` 와 1:1 대응한다. 분모 상수(15/20/30 등)는
 * scoring.py 의 subscore 스케일에 의존하므로, scoring.py 변경 시 여기 분모도 동기화할 것.
 */

/** 0~1 로 자른다. */
function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/**
 * 컴포넌트(정규화값 0~1 · 가중치) 목록을 받아 가중평균을 0~100 으로 환산한다.
 *
 * - `value === null` 인 컴포넌트는 분자·분모 양쪽에서 제외(가중치 재배분).
 * - 유효 가중치 합이 0 이면(모든 컴포넌트 결손) `null` 반환.
 */
function weightedScore(
  components: readonly { value: number | null; weight: number }[]
): { score: number | null; usedWeight: number } {
  let weightedSum = 0
  let usedWeight = 0
  for (const { value, weight } of components) {
    if (value === null) continue
    weightedSum += clamp01(value) * weight
    usedWeight += weight
  }
  if (usedWeight === 0) return { score: null, usedWeight: 0 }
  return { score: (weightedSum / usedWeight) * 100, usedWeight }
}

// ── 단기 점수 ─────────────────────────────────────────────────────────────

/** 단기 점수 가중치(data-model.md §2.2). */
export const SHORT_WEIGHTS = {
  momentum: 0.45,
  week52Position: 0.3,
  sentiment: 0.25,
} as const

/** 모멘텀 정규화: 15거래일 smoothedScore 차(Δ)를 ±10 클립해 0~1. */
const MOMENTUM_CLIP = 10
/** 심리(sentimentScore) 정규화 분모(실측 max 15). */
const SENTIMENT_MAX = 15

/** 모멘텀 lookback(거래일). 랭킹 API·종목 상세가 공유하는 단일 상수. */
export const MOMENTUM_LOOKBACK = 15

/**
 * smoothedScore 시계열(date 오름차순)에서 (최신 − lookback거래일 전) Δ.
 *
 * 랭킹 API(`/api/rankings`)와 종목 상세 위젯이 **이 한 함수**로 모멘텀을 구해
 * 동일 시계열 → 동일 Δ → 동일 단기 점수를 보장한다(점수 일치 SoT, 통합 기획서 §9.1).
 * - 길이가 lookback 이하(신규상장)면 `null` → momentumPartial 로 처리된다.
 * - 결손 지점(null smoothedScore)은 0 으로 간주한다(양쪽 동일 정책 — 행 건너뛰기 금지로
 *   인덱스 정렬이 어긋나지 않게 한다). 실데이터상 smoothedScore 결손은 없다.
 */
export function computeMomentumDelta(
  smoothedAsc: readonly (number | null)[],
  lookback: number = MOMENTUM_LOOKBACK
): number | null {
  if (smoothedAsc.length <= lookback) return null
  const latest = smoothedAsc[smoothedAsc.length - 1] ?? 0
  const past = smoothedAsc[smoothedAsc.length - 1 - lookback] ?? 0
  return latest - past
}

export interface ShortScoreInput {
  /**
   * 15거래일 전 대비 smoothedScore 변화량(Δ). 시계열이 짧아(신규상장) 산출 불가면 `null`.
   * null 이면 momentumPartial=true 로 표기되고 모멘텀 컴포넌트는 가중치 재배분된다.
   */
  momentumDelta: number | null
  /** 현재가(통화 무관, 같은 ticker 비율이라 환율 상쇄). */
  price: number | null
  /** 52주 최고가(price 와 같은 통화). */
  week52High: number | null
  /** 52주 최저가(price 와 같은 통화). */
  week52Low: number | null
  /** 심리(애널리스트) 점수, 무차원. */
  sentimentScore: number | null
}

export interface ShortScoreResult {
  /** 0~100. 모든 컴포넌트 결손 시 null. */
  score: number | null
  /** 모멘텀(추세) 데이터 결손 여부 — UI "추세 데이터 부족" 표기용. */
  momentumPartial: boolean
}

/** 52주 밴드 내 위치 0~1. 밴드 폭이 0 이하/결손이면 null. */
function week52PositionNorm(
  price: number | null,
  high: number | null,
  low: number | null
): number | null {
  if (price === null || high === null || low === null) return null
  const band = high - low
  if (band <= 0) return null
  return clamp01((price - low) / band)
}

/**
 * 단기 점수 — "지금 분위기·흐름이 좋은가" (0~100).
 *
 * 0.45·모멘텀 + 0.30·52주 위치 + 0.25·심리. null 컴포넌트는 가중치 재배분.
 */
export function computeShortScore(input: ShortScoreInput): ShortScoreResult {
  const momentumPartial = input.momentumDelta === null

  const momentumNorm =
    input.momentumDelta === null
      ? null
      : clamp01((input.momentumDelta + MOMENTUM_CLIP) / (MOMENTUM_CLIP * 2))

  const week52Norm = week52PositionNorm(
    input.price,
    input.week52High,
    input.week52Low
  )

  const sentimentNorm =
    input.sentimentScore === null ? null : input.sentimentScore / SENTIMENT_MAX

  const { score } = weightedScore([
    { value: momentumNorm, weight: SHORT_WEIGHTS.momentum },
    { value: week52Norm, weight: SHORT_WEIGHTS.week52Position },
    { value: sentimentNorm, weight: SHORT_WEIGHTS.sentiment },
  ])

  return { score, momentumPartial }
}

// ── 장기 점수 ─────────────────────────────────────────────────────────────

/** 장기 점수 가중치(data-model.md §2.3). */
export const LONG_WEIGHTS = {
  profitability: 0.3,
  growth: 0.25,
  scale: 0.2,
  upside: 0.25,
} as const

/** subscore 재정규화 분모(실측 max). scoring.py 스케일 변경 시 동기화. */
const PROFITABILITY_MAX = 20
const GROWTH_MAX = 30
const SCALE_MAX = 30
/** 상승여력 정규화 구간: -20% → 0, +40% → 100. */
const UPSIDE_LOWER = -0.2
const UPSIDE_SPAN = 0.6

export interface LongScoreInput {
  /** 수익성 subscore(0~20), 무차원. */
  profitabilityScore: number | null
  /** 성장 subscore(0~30), 무차원. */
  growthScore: number | null
  /** 규모 subscore(0~30), 무차원. */
  scaleScore: number | null
  /** 목표주가 — **USD 환산값**(toUsd 적용 후). 호출부 책임. */
  targetUsd: number | null
  /** 현재가 — **USD 환산값**(toUsd 적용 후). */
  priceUsd: number | null
}

export interface LongScoreResult {
  /** 0~100. 모든 컴포넌트 결손 시 null. */
  score: number | null
  /** 상승여력 비율(소수). target/price 결손 시 null. 표 표시·정렬에 재사용. */
  upsidePct: number | null
}

/** 상승여력 비율(소수). 둘 다 USD 환산값. price<=0/결손이면 null. */
export function computeUpsidePct(
  targetUsd: number | null,
  priceUsd: number | null
): number | null {
  if (targetUsd === null || priceUsd === null || priceUsd <= 0) return null
  return (targetUsd - priceUsd) / priceUsd
}

/**
 * 장기 점수 — "오래 묵힐 만한 가치가 있나" (0~100).
 *
 * 0.30·수익성 + 0.25·성장 + 0.20·규모 + 0.25·상승여력. null 컴포넌트는 가중치 재배분.
 */
export function computeLongScore(input: LongScoreInput): LongScoreResult {
  const profitNorm =
    input.profitabilityScore === null
      ? null
      : input.profitabilityScore / PROFITABILITY_MAX
  const growthNorm =
    input.growthScore === null ? null : input.growthScore / GROWTH_MAX
  const scaleNorm = input.scaleScore === null ? null : input.scaleScore / SCALE_MAX

  const upsidePct = computeUpsidePct(input.targetUsd, input.priceUsd)
  const upsideNorm =
    upsidePct === null ? null : clamp01((upsidePct - UPSIDE_LOWER) / UPSIDE_SPAN)

  const { score } = weightedScore([
    { value: profitNorm, weight: LONG_WEIGHTS.profitability },
    { value: growthNorm, weight: LONG_WEIGHTS.growth },
    { value: scaleNorm, weight: LONG_WEIGHTS.scale },
    { value: upsideNorm, weight: LONG_WEIGHTS.upside },
  ])

  return { score, upsidePct }
}

// ── 통합 산출 (랭킹 API · 종목 상세 공유 진입점) ─────────────────────────────

export interface RankingScoreInput
  extends Omit<ShortScoreInput, never>,
    Omit<LongScoreInput, 'priceUsd'> {
  /**
   * 현재가(네이티브 통화). 52주 위치는 같은 통화 비율이라 그대로 쓰고,
   * 상승여력은 priceUsd(USD 환산)로 계산한다.
   */
  price: number | null
  /** 현재가 USD 환산값(상승여력 계산용). 호출부에서 toUsd 적용. */
  priceUsd: number | null
}

export interface RankingScoreResult {
  shortScore: number | null
  longScore: number | null
  momentumPartial: boolean
  upsidePct: number | null
}

/**
 * 단기·장기 점수를 한 번에 산출하는 통합 진입점.
 * 랭킹 API 와 종목 상세 위젯이 **동일 입력 → 동일 출력**을 보장하도록 공유한다.
 */
export function computeRankingScores(
  input: RankingScoreInput
): RankingScoreResult {
  const short = computeShortScore({
    momentumDelta: input.momentumDelta,
    price: input.price,
    week52High: input.week52High,
    week52Low: input.week52Low,
    sentimentScore: input.sentimentScore,
  })
  const long = computeLongScore({
    profitabilityScore: input.profitabilityScore,
    growthScore: input.growthScore,
    scaleScore: input.scaleScore,
    targetUsd: input.targetUsd,
    priceUsd: input.priceUsd,
  })

  return {
    shortScore: short.score,
    longScore: long.score,
    momentumPartial: short.momentumPartial,
    upsidePct: long.upsidePct,
  }
}
