import type { RecommendationTrendPoint } from '@/types'

/**
 * 애널리스트 투자의견 분포(Yahoo recommendationTrend) 표시용 순수 함수.
 *
 * 기존 `recommendationKey`(단일 라벨: 적극 매수/매수/…)는 합의 결과만 보여줘서
 * "몇 명이 보유·매도를 냈는지"가 사라진다. 이 모듈은 5개 등급 인원수를
 * 비율 세그먼트로 바꿔 stacked bar 로 그릴 수 있게 한다. 인원수라 통화 무관.
 */

/** 최신순 고정. Yahoo 는 '0m'(이번 달) ~ '-3m' 를 순서 보장 없이 준다. */
const PERIOD_ORDER = ['0m', '-1m', '-2m', '-3m']

const PERIOD_LABELS: Record<string, string> = {
  '0m': '이번 달',
  '-1m': '1개월 전',
  '-2m': '2개월 전',
  '-3m': '3개월 전',
}

export type RecommendationGrade =
  | 'strongBuy'
  | 'buy'
  | 'hold'
  | 'sell'
  | 'strongSell'

/**
 * 등급 정의 — 라벨이 1차 의미, 색은 보조(색만으로 의미 전달 금지).
 * lib/format 의 RECOMMENDATION_LABELS 와 어휘를 맞추되, Yahoo 필드명이
 * strongSell 까지 5단계라 '적극 매도'를 추가로 둔다.
 */
export const RECOMMENDATION_GRADES: {
  key: RecommendationGrade
  label: string
  colorClass: string
}[] = [
  { key: 'strongBuy', label: '적극 매수', colorClass: 'bg-success' },
  { key: 'buy', label: '매수', colorClass: 'bg-success/50' },
  { key: 'hold', label: '보유', colorClass: 'bg-muted-foreground/40' },
  { key: 'sell', label: '매도', colorClass: 'bg-danger/50' },
  { key: 'strongSell', label: '적극 매도', colorClass: 'bg-danger' },
]

export interface RecommendationSegment {
  key: RecommendationGrade
  label: string
  colorClass: string
  count: number
  /** 해당 기간 총 애널리스트 수 대비 비율(%). total=0 이면 0. */
  pct: number
}

export interface RecommendationTrendSummary {
  period: string
  periodLabel: string
  total: number
  segments: RecommendationSegment[]
}

export function summarizeTrendPoint(
  point: RecommendationTrendPoint
): RecommendationTrendSummary {
  const counts = RECOMMENDATION_GRADES.map((g) => ({
    ...g,
    count: point[g.key] ?? 0,
  }))
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  return {
    period: point.period,
    periodLabel: PERIOD_LABELS[point.period] ?? point.period,
    total,
    segments: counts.map((c) => ({
      ...c,
      pct: total > 0 ? (c.count / total) * 100 : 0,
    })),
  }
}

/**
 * 최신순 정렬 + 인원 0인 기간 제거.
 * (커버리지가 끊긴 과거 달이 빈 막대로 남으면 "의견 없음"이 아니라
 * "데이터 없음"인데 전자로 읽힌다.)
 */
export function summarizeTrend(
  points: RecommendationTrendPoint[]
): RecommendationTrendSummary[] {
  return [...points]
    .sort((a, b) => periodRank(a.period) - periodRank(b.period))
    .map(summarizeTrendPoint)
    .filter((s) => s.total > 0)
}

function periodRank(period: string): number {
  const index = PERIOD_ORDER.indexOf(period)
  return index === -1 ? PERIOD_ORDER.length : index
}
