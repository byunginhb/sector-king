/**
 * DCF(Discounted Cash Flow) 점수 — "지금 주가가 내재가치 대비 싼가" (0~100) + 상승예측 %.
 *
 * 표준 2단계 DCF: 예측기간 N년(성장률 선형 점감) PV 합 + 잔존가치(TV) PV.
 * 회사가 앞으로 벌 잉여현금흐름(FCF)을 현재가치로 환산해 주당 내재가치를 추정하고,
 * 현재가 대비 상승여력(upside)을 점수화한다. 절대가치 평가이므로 가정(g·r)에 민감하다.
 *
 * 설계 원칙(lib/ranking-score.ts 와 동일)
 * - 순수함수: 입력 → 출력 1:1, 부수효과 없음(SSR/CSR/API 동일 결과).
 * - 통화를 모른다: DCF 내부 계산은 네이티브 통화로 끝내고, 주당 내재가치 1회만
 *   호출부가 주입한 `intrinsicToUsd`(= toUsd(x, ticker))로 USD 변환한다.
 *   가격성 비교(priceUsd/marketCapUsd)도 호출부가 toUsd 적용해 전달한다.
 * - 결손/이상치는 행을 제외하지 않고 dcfAvailable=false + dcfReason 으로 표기한다.
 */

/** 0~1 로 자른다. */
function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/** [min, max] 로 자른다. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

// ── 상수 (튜닝 용이하게 export) ──────────────────────────────────────────────

/** 예측기간(년). */
export const FORECAST_YEARS = 10
/** 초기 성장률 g0 클램프 하한/상한 — 미적용 시 revenueGrowth 이상치로 점수가 양극화된다. */
export const INITIAL_GROWTH_CAP_LOW = -0.05
export const INITIAL_GROWTH_CAP_HIGH = 0.15
/** revenueGrowth 결손 시 초기 성장률 대체값. */
export const INITIAL_GROWTH_FALLBACK = 0.08
/** 영구 성장률(잔존가치). */
export const TERMINAL_GROWTH = 0.025
/** 할인율 r 의 하한/상한. */
export const R_MIN = 0.06
export const R_MAX = 0.12
/**
 * upside → score 정규화 구간. DCF_UPSIDE_LOWER 에서 0점, +DCF_UPSIDE_SPAN 만큼 위에서 100점.
 * 실데이터(412종) upside 분위수 p10≈-0.81 / p90≈+2.37 에 맞춰 [-0.8, +2.4] 로 보정.
 * (초기 임시값 [-0.5,+1.0] 은 양극 쏠림 28%/20% → 보정 후 약 10%/10%.)
 * DCF 추정은 분산이 커 극단 클리핑이 일부 남는 게 정상. 재측정: scripts/dcf-distribution.ts.
 */
export const DCF_UPSIDE_LOWER = -0.8
export const DCF_UPSIDE_SPAN = 3.2

// 불변식: TERMINAL_GROWTH(0.025) < R_MIN(0.06) 이므로 TV 분모(r - g_term) ≥ 0.035 > 0 이 항상 보장된다.
//        상수를 바꿀 때 이 불변식(TERMINAL_GROWTH < R_MIN)을 반드시 유지할 것.

export interface DcfInput {
  /** FCF0 — 네이티브 통화, TTM 단일값. DCF input: keep native, do NOT toUsd. */
  freeCashflow: number | null
  /** 매출 성장률(소수). g0 도출에 사용, 무차원. */
  revenueGrowth: number | null
  /** 베타, 무차원. 할인율 r 가산. */
  beta: number | null
  /** 부채비율 — 퍼센트 스케일(예: 139.511 = 139.5%). 내부에서 /100 한다. */
  debtToEquity: number | null
  /** 시가총액(네이티브) — 주식수 역산용. */
  marketCapNative: number | null
  /** 현재가(네이티브) — 주식수 역산용. */
  priceNative: number | null
  /** 시가총액(USD 환산) — 규모가산 비교용. 호출부가 toUsd 적용. */
  marketCapUsd: number | null
  /** 현재가(USD 환산) — upside 계산용. 호출부가 toUsd 적용. */
  priceUsd: number | null
  /** 주당 네이티브 내재가치 → USD 변환 주입(= toUsd(x, ticker)). 통화 책임 위임. */
  intrinsicToUsd: (nativePerShare: number) => number
  /** company_profiles.sector. 'Financial Services' 면 DCF 부적합으로 제외. */
  sector: string | null
}

export interface DcfResult {
  /** 0~100. 제외/결손 시 null. */
  dcfScore: number | null
  /** (내재가치 − 현재가) / 현재가, 비율(소수). 제외/결손 시 null. */
  dcfUpsidePct: number | null
  /** 주당 내재가치(USD). 표시 최소화(툴팁용). 제외/결손 시 null. */
  dcfIntrinsicUsd: number | null
  /** DCF 적용 가능 여부. */
  dcfAvailable: boolean
  /** 제외 사유. null = 적용됨. */
  dcfReason: 'finance' | 'negativeFcf' | 'missing' | 'lowConfidence' | null
  /** 도출된 할인율 r(투명성용). 제외 시 null. */
  dcfDiscountRate: number | null
  /**
   * 연도별 예측 현금흐름(네이티브 통화 · 기업 전체 FCF). 표시 전용.
   * fcf=해당 연도 예측 FCF, pv=그 현재가치. 제외 시 null.
   * 통화 변환은 호출부가 toUsd(value, ticker) 로 수행한다(dcf.ts 는 통화 무지).
   */
  dcfProjections: { year: number; fcf: number; pv: number }[] | null
  /** 잔존가치(TV)의 현재가치(네이티브). 표시 전용. 제외 시 null. */
  dcfTerminalPv: number | null
}

const EXCLUDED: Omit<DcfResult, 'dcfReason'> = {
  dcfScore: null,
  dcfUpsidePct: null,
  dcfIntrinsicUsd: null,
  dcfAvailable: false,
  dcfDiscountRate: null,
  dcfProjections: null,
  dcfTerminalPv: null,
}

/**
 * 할인율 r — 무위험 기준 0.06 에 베타·부채·규모 가산을 더해 [R_MIN, R_MAX] 로 자른다.
 */
export function deriveDiscountRate(input: {
  beta: number | null
  debtToEquity: number | null
  marketCapUsd: number | null
}): number {
  // 베타 가산
  const beta = input.beta
  const betaAdd =
    beta === null
      ? 0.015
      : beta <= 0.8
        ? 0.0
        : beta <= 1.2
          ? 0.01
          : beta <= 1.6
            ? 0.02
            : 0.03

  // 부채 가산 — debtToEquity 는 퍼센트라 /100 (예: 139.511 → 1.395)
  const de = input.debtToEquity === null ? null : input.debtToEquity / 100
  const debtAdd =
    de === null ? 0.005 : de <= 0.5 ? 0.0 : de <= 1.5 ? 0.01 : 0.02

  // 규모 가산 — 반드시 USD 기준(네이티브 비교 시 KR 이 항상 대형주 오판)
  const mc = input.marketCapUsd
  const sizeAdd = mc === null ? 0 : mc >= 200e9 ? -0.005 : mc < 2e9 ? 0.01 : 0

  return clamp(0.06 + betaAdd + debtAdd + sizeAdd, R_MIN, R_MAX)
}

/**
 * 2단계 DCF 로 주당 내재가치·상승예측·점수를 산출한다.
 * 제외 조건(금융주/음수FCF/자료부족)·NaN 누출은 모두 가드로 막는다.
 */
export function computeDcf(input: DcfInput): DcfResult {
  // 금융주 — FCF 정의가 달라 DCF 부적합. 단 company_profiles.sector 가 약 69% NULL 이라
  // sector 기반 제외는 일부만 작동한다(알려진 한계). 음수 FCF 가드가 주 방어선.
  if (input.sector === 'Financial Services') {
    return { ...EXCLUDED, dcfReason: 'finance' }
  }

  // 음수/결손 FCF — DCF 적용 불가
  if (input.freeCashflow === null || input.freeCashflow <= 0) {
    return { ...EXCLUDED, dcfReason: 'negativeFcf' }
  }

  // 주식수 역산 = marketCapNative / priceNative (둘 다 같은 네이티브 → 비율 상쇄)
  if (
    input.priceNative === null ||
    input.priceNative <= 0 ||
    input.marketCapNative === null ||
    input.priceUsd === null ||
    input.priceUsd <= 0
  ) {
    return { ...EXCLUDED, dcfReason: 'missing' }
  }
  const shares = input.marketCapNative / input.priceNative
  if (!Number.isFinite(shares) || shares <= 0) {
    return { ...EXCLUDED, dcfReason: 'missing' }
  }

  const r = deriveDiscountRate(input)
  const gTerm = TERMINAL_GROWTH
  const g0 =
    input.revenueGrowth === null
      ? INITIAL_GROWTH_FALLBACK
      : clamp(input.revenueGrowth, INITIAL_GROWTH_CAP_LOW, INITIAL_GROWTH_CAP_HIGH)

  const N = FORECAST_YEARS
  const fcf0 = input.freeCashflow

  // 예측기간 FCF 의 현가 합 — 성장률 g_k 는 g0 → g_term 선형 점감
  let cumFcf = fcf0
  let pvSum = 0
  let fcfN = fcf0
  const projections: { year: number; fcf: number; pv: number }[] = []
  for (let k = 1; k <= N; k++) {
    const gk = g0 + (gTerm - g0) * (k / N)
    cumFcf = cumFcf * (1 + gk)
    const pv = cumFcf / Math.pow(1 + r, k)
    pvSum += pv
    fcfN = cumFcf
    projections.push({ year: k, fcf: cumFcf, pv })
  }

  // 잔존가치(TV) 현가 — r - gTerm 은 불변식상 ≥ 0.035 > 0
  const tv = (fcfN * (1 + gTerm)) / (r - gTerm)
  const pvTv = tv / Math.pow(1 + r, N)

  const intrinsicNative = pvSum + pvTv
  const intrinsicPerShareNative = intrinsicNative / shares
  const intrinsicValueUsd = input.intrinsicToUsd(intrinsicPerShareNative)
  const priceUsd = input.priceUsd

  const dcfUpsidePct = (intrinsicValueUsd - priceUsd) / priceUsd
  const dcfScore =
    clamp01((dcfUpsidePct - DCF_UPSIDE_LOWER) / DCF_UPSIDE_SPAN) * 100

  // NaN/Infinity 차단 — clamp01 은 NaN 을 통과시키므로(NaN<0·NaN>1 모두 false) 명시적으로 막는다.
  if (
    !Number.isFinite(intrinsicValueUsd) ||
    !Number.isFinite(dcfUpsidePct) ||
    !Number.isFinite(dcfScore)
  ) {
    return { ...EXCLUDED, dcfReason: 'missing' }
  }

  return {
    dcfScore,
    dcfUpsidePct,
    dcfIntrinsicUsd: intrinsicValueUsd,
    dcfAvailable: true,
    dcfReason: null,
    dcfDiscountRate: r,
    dcfProjections: projections,
    dcfTerminalPv: pvTv,
  }
}
