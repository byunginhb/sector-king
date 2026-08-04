import { describe, it, expect } from 'vitest'
import {
  RECOMMENDATION_GRADES,
  summarizeTrend,
  summarizeTrendPoint,
} from '@/lib/analyst-recommendation'
import type { RecommendationTrendPoint } from '@/types'

function point(
  period: string,
  counts: Partial<Omit<RecommendationTrendPoint, 'period'>> = {}
): RecommendationTrendPoint {
  return {
    period,
    strongBuy: 0,
    buy: 0,
    hold: 0,
    sell: 0,
    strongSell: 0,
    ...counts,
  }
}

describe('summarizeTrendPoint', () => {
  it('총원과 각 등급 비율을 계산한다', () => {
    const s = summarizeTrendPoint(point('0m', { strongBuy: 10, buy: 30, hold: 10 }))

    expect(s.total).toBe(50)
    expect(s.periodLabel).toBe('이번 달')
    const byKey = Object.fromEntries(s.segments.map((x) => [x.key, x.pct]))
    expect(byKey.strongBuy).toBe(20)
    expect(byKey.buy).toBe(60)
    expect(byKey.hold).toBe(20)
    expect(byKey.sell).toBe(0)
  })

  it('비율 합은 100%다 (막대가 꽉 차야 함)', () => {
    const s = summarizeTrendPoint(
      point('0m', { strongBuy: 3, buy: 7, hold: 5, sell: 2, strongSell: 1 })
    )
    const sum = s.segments.reduce((acc, x) => acc + x.pct, 0)
    expect(sum).toBeCloseTo(100, 10)
  })

  it('총원 0이면 0으로 나누지 않는다 (NaN 폭 방지)', () => {
    const s = summarizeTrendPoint(point('0m'))

    expect(s.total).toBe(0)
    expect(s.segments.every((x) => x.pct === 0)).toBe(true)
  })

  it('5개 등급을 항상 고정 순서로 낸다 (범례와 막대 순서 일치)', () => {
    const s = summarizeTrendPoint(point('0m', { buy: 1 }))
    expect(s.segments.map((x) => x.key)).toEqual(
      RECOMMENDATION_GRADES.map((g) => g.key)
    )
  })
})

describe('summarizeTrend', () => {
  it('입력 순서와 무관하게 최신순으로 정렬한다', () => {
    const rows = summarizeTrend([
      point('-2m', { buy: 5 }),
      point('0m', { buy: 8 }),
      point('-3m', { buy: 4 }),
      point('-1m', { buy: 6 }),
    ])

    expect(rows.map((r) => r.period)).toEqual(['0m', '-1m', '-2m', '-3m'])
    expect(rows.map((r) => r.periodLabel)).toEqual([
      '이번 달',
      '1개월 전',
      '2개월 전',
      '3개월 전',
    ])
  })

  it('인원 0인 기간은 제거한다 (커버리지 없음을 빈 막대로 오독 방지)', () => {
    const rows = summarizeTrend([point('0m', { buy: 3 }), point('-1m')])

    expect(rows).toHaveLength(1)
    expect(rows[0].period).toBe('0m')
  })

  it('입력 배열을 변경하지 않는다', () => {
    const input = [point('-1m', { buy: 1 }), point('0m', { buy: 2 })]
    summarizeTrend(input)
    expect(input.map((p) => p.period)).toEqual(['-1m', '0m'])
  })

  it('알 수 없는 기간은 뒤로 밀고 라벨을 원문 유지한다', () => {
    const rows = summarizeTrend([point('-5m', { buy: 1 }), point('0m', { buy: 1 })])

    expect(rows.map((r) => r.period)).toEqual(['0m', '-5m'])
    expect(rows[1].periodLabel).toBe('-5m')
  })
})
