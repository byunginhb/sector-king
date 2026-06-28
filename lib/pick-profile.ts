/**
 * 섹터킹 픽 — 투자 성향별 가중치 SoT.
 *
 * 단기·장기·DCF 세 점수(각 0~100)를 성향에 따라 가중평균해 "픽" 종합점수를 만든다.
 * - 단기 점수: 모멘텀·52주 위치·심리(타이밍)
 * - 장기 점수: 수익성·성장·규모·애널리스트 기대(품질)
 * - DCF 점수: 현재 현금흐름 대비 저평가도(밸류에이션)
 *
 * 설계 원칙
 * - DCF 는 조연(틸트)이지 주연이 아니다: 과반을 주면 "싼 종목"만 떠 밸류 트랩(경기민감주
 *   피크 FCF) 위험. 어느 프로필도 한 축이 과반을 크게 넘지 않게 둔다.
 * - 순수함수: SSR/CSR/API 동일 결과. 통화를 모른다(입력은 이미 산출된 0~100 점수).
 * - 결손(예: DCF 미산출 종목 약 1/3)은 가중치 재분배(graceful) — 행 제외 안 함.
 */

export type PickProfile = 'short' | 'balanced' | 'long'

/** 표시·순회 순서(단기 → 균형 → 장기). */
export const PICK_PROFILES: readonly PickProfile[] = ['short', 'balanced', 'long'] as const

/** 프로필별 가중치(합=1). 튜닝은 여기 한 곳만 수정. */
export const PICK_WEIGHTS: Record<
  PickProfile,
  { short: number; long: number; dcf: number }
> = {
  short: { short: 0.6, long: 0.3, dcf: 0.1 },
  balanced: { short: 0.35, long: 0.4, dcf: 0.25 },
  long: { short: 0.15, long: 0.5, dcf: 0.35 },
}

/** UI 라벨·설명 SoT(세그먼티드 컨트롤·캡션 공유). */
export const PICK_PROFILE_META: Record<
  PickProfile,
  { label: string; caption: string; description: string }
> = {
  short: {
    label: '단기',
    caption: '트레이더',
    description:
      '수일~수개월 단기 매매 성향이에요. 지금 흐름·모멘텀이 좋은 종목을 우선하고, 적정가(밸류)는 거의 보지 않아요.',
  },
  balanced: {
    label: '균형',
    caption: '기본',
    description:
      '흐름·사업 품질·적정가를 고루 반영한 일반 추천이에요. 어느 쪽도 치우치지 않아요.',
  },
  long: {
    label: '장기',
    caption: '투자자',
    description:
      '수년 보유 성향이에요. 사업 품질과 저평가(적정가 대비 쌈)를 중시하고, 단기 흐름은 최소만 반영해요.',
  },
}

export function isPickProfile(v: unknown): v is PickProfile {
  return v === 'short' || v === 'balanced' || v === 'long'
}

/**
 * 프로필 가중 종합점수(0~100). null 컴포넌트는 가중치 재분배(유효분만 정규화).
 * 세 점수 모두 결손이면 null.
 *
 * 예) 장기 프로필에서 DCF 결손 → short 0.15·long 0.5 만 남아 0.23:0.77 로 재정규화.
 */
export function weightedPickScore(
  shortScore: number | null,
  longScore: number | null,
  dcfScore: number | null,
  profile: PickProfile
): number | null {
  const w = PICK_WEIGHTS[profile]
  const parts: { value: number | null; weight: number }[] = [
    { value: shortScore, weight: w.short },
    { value: longScore, weight: w.long },
    { value: dcfScore, weight: w.dcf },
  ]
  let weightedSum = 0
  let usedWeight = 0
  for (const { value, weight } of parts) {
    if (value === null) continue
    weightedSum += value * weight
    usedWeight += weight
  }
  if (usedWeight === 0) return null
  return weightedSum / usedWeight
}
