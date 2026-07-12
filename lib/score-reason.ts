/**
 * 점수(단기·장기) 한 줄 근거 생성 — 순수함수.
 *
 * 점수를 구성하는 실제 지표값을 사람이 읽을 수 있는 한 줄로 요약한다.
 * "왜 이 점수인가"를 정성 설명이 아니라 종목별 데이터로 답하는 것이 목적(#26).
 * UI 무지: 문자열만 반환하고 렌더링/통화 변환은 호출부 책임.
 */

/** 0~1 정규값을 강도 표현으로. 결손(null)은 제외 신호로 null 반환. */
function strengthWord(norm: number | null | undefined): string | null {
  if (norm == null || !Number.isFinite(norm)) return null
  if (norm >= 0.66) return '상위권'
  if (norm >= 0.33) return '중위권'
  return '하위권'
}

/** 소수 비율(0.43)을 부호 포함 퍼센트 문자열("+43%")로. */
function signedPct(ratio: number): string {
  return `${ratio >= 0 ? '+' : ''}${Math.round(ratio * 100)}%`
}

const INSUFFICIENT = '점수 산출에 쓰인 데이터가 부족해 근거를 표시할 수 없어요.'

export interface ShortReasonInput {
  /** 52주 밴드 내 위치(0~1). */
  week52Position: number | null
  /** 최근 점수 추세 Δ. null=데이터 부족. */
  momentumDelta: number | null
  /** 모멘텀 데이터 부족(상장 초기) 여부. */
  momentumPartial: boolean
  /** 시장 심리 정규값(0~1). */
  sentimentNorm: number | null
}

/** 단기 점수 = 최근 흐름·52주 위치·시장 심리 종합. */
export function shortScoreReason(i: ShortReasonInput): string {
  const parts: string[] = []
  if (i.week52Position != null && Number.isFinite(i.week52Position)) {
    parts.push(`52주 위치 ${Math.round(i.week52Position * 100)}%`)
  }
  if (i.momentumPartial) {
    parts.push('최근 흐름 데이터 부족')
  } else if (i.momentumDelta != null && Number.isFinite(i.momentumDelta)) {
    const dir = i.momentumDelta > 0 ? '상승세' : i.momentumDelta < 0 ? '하락세' : '보합'
    parts.push(`최근 흐름 ${dir}`)
  }
  const s = strengthWord(i.sentimentNorm)
  if (s) parts.push(`시장심리 ${s}`)

  if (parts.length === 0) return INSUFFICIENT
  return `${parts.join(' · ')}를 합쳐 매긴 점수예요.`
}

export interface LongReasonInput {
  /** 수익성 정규값(0~1). */
  profitabilityNorm: number | null
  /** 성장성 정규값(0~1). */
  growthNorm: number | null
  /** 규모 정규값(0~1). */
  scaleNorm: number | null
  /** 목표주가 상승여력(소수 비율). */
  upsidePct: number | null
}

/** 장기 점수 = 수익성·성장성·규모·목표주가 상승여력 종합. */
export function longScoreReason(i: LongReasonInput): string {
  const parts: string[] = []
  const p = strengthWord(i.profitabilityNorm)
  if (p) parts.push(`수익성 ${p}`)
  const g = strengthWord(i.growthNorm)
  if (g) parts.push(`성장성 ${g}`)
  const sc = strengthWord(i.scaleNorm)
  if (sc) parts.push(`규모 ${sc}`)
  if (i.upsidePct != null && Number.isFinite(i.upsidePct)) {
    parts.push(`목표주가까지 ${signedPct(i.upsidePct)}`)
  }

  if (parts.length === 0) return INSUFFICIENT
  return `${parts.join(' · ')}를 합쳐 매긴 점수예요.`
}
