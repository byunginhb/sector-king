import { describe, it, expect } from 'vitest'
import {
  makePriceResolver,
  scoreSeries,
  summarize,
  achievementRate,
  wilsonLowerBound,
  predictionScore,
  type PricePoint,
  type ReportPoint,
} from '@/lib/analyst-consensus/accuracy'

const prices: PricePoint[] = [
  { date: '2026-02-02', price: 100 },
  { date: '2026-03-02', price: 120 },
  { date: '2026-04-01', price: 140 },
  { date: '2026-05-01', price: 200 },
  { date: '2026-06-01', price: 250 },
]

describe('makePriceResolver', () => {
  const at = makePriceResolver(prices)
  it('exact 거래일 종가', () => expect(at('2026-03-02')).toBe(120))
  it('휴장일 → 직후 첫 거래일(±5)', () => expect(at('2026-02-01')).toBe(100))
  it('직후 없으면 직전(±5)', () => expect(at('2026-05-03')).toBe(200))
  it('창(5일) 초과 → null', () => expect(at('2026-01-01')).toBeNull())
})

describe('scoreSeries — 방향 적중 (구간 = 발표일 → 다음 리포트일)', () => {
  const at = makePriceResolver(prices)
  // new → up(hit) → hold → down(miss, 진행중 to now)
  const reports: ReportPoint[] = [
    { date: '2026-02-02', target: 200 }, // 첫 리포트 = new
    { date: '2026-03-02', target: 250 }, // 상향; 구간 03-02(120)→04-01(140) 상승 = hit
    { date: '2026-04-01', target: 250 }, // 유지 = hold (분모 제외)
    { date: '2026-05-01', target: 200 }, // 하향; 마지막(진행중); 구간 05-01(200)→now06-01(250) 상승 = miss
  ]
  const preds = scoreSeries(reports, at, '2026-06-01')

  it('첫 리포트 = new', () => expect(preds[0].status).toBe('new'))
  it('상향+상승 = hit', () => expect(preds[1].status).toBe('hit'))
  it('유지 = hold', () => expect(preds[2].status).toBe('hold'))
  it('하향+상승 = miss', () => expect(preds[3].status).toBe('miss'))
  it('마지막 = 진행중 플래그', () => expect(preds[3].inProgress).toBe(true))

  it('요약: hit 1 / miss 1 / scored 2 (new·hold 제외)', () => {
    const s = summarize(preds)
    expect(s.hits).toBe(1)
    expect(s.misses).toBe(1)
    expect(s.scored).toBe(2)
    expect(s.hitRate).toBe(0.5)
  })
})

describe('scoreSeries — 가격 이력 이전 구간은 unscorable', () => {
  const at = makePriceResolver(prices)
  const reports: ReportPoint[] = [
    { date: '2025-12-01', target: 100 }, // new
    { date: '2025-12-15', target: 120 }, // 상향이나 발표일가 없음(이력 이전) → unscorable
    { date: '2026-02-02', target: 130 }, // 상향, 발표일가 존재
  ]
  const preds = scoreSeries(reports, at, '2026-06-01')
  it('이력 이전 상향 = unscorable', () => expect(preds[1].status).toBe('unscorable'))
  it('unscorable 은 분모 제외', () => expect(summarize(preds).scored).toBe(1))
})

describe('achievementRate', () => {
  it('발표일가 100, 현재 130, 목표 200 → 30/100 = 0.3', () =>
    expect(achievementRate(100, 130, 200)).toBeCloseTo(0.3))
  it('목표=발표일가(분모 0) → null', () => expect(achievementRate(100, 130, 100)).toBeNull())
  it('가격 누락 → null', () => expect(achievementRate(null, 130, 200)).toBeNull())
})

describe('wilsonLowerBound / predictionScore — 예측력 점수', () => {
  it('표본 0 → null', () => {
    expect(wilsonLowerBound(0, 0)).toBeNull()
    expect(predictionScore(0, 0)).toBeNull()
  })
  it('소표본 100%(3/3) 는 크게 벌점 → 44점', () => expect(predictionScore(3, 3)).toBe(44))
  it('소표본 100%(4/4) → 51점', () => expect(predictionScore(4, 4)).toBe(51))
  it('대표본 71%(15/21) → 50점', () => expect(predictionScore(15, 21)).toBe(50))
  it('대표본 100%(50/50) 는 높은 점수 → 93점', () => expect(predictionScore(50, 50)).toBe(93))
  it('같은 100%라도 표본 많을수록 점수 높다(예측 횟수 가중)', () => {
    expect(predictionScore(50, 50)!).toBeGreaterThan(predictionScore(3, 3)!)
  })
  it('소표본 100%(3/3) 가 대표본 71%(15/21) 보다 낮다(소표본 100% 상위 방지)', () => {
    expect(predictionScore(3, 3)!).toBeLessThan(predictionScore(15, 21)!)
  })
  // 종목 상세 정렬 기준 — 리포트 10건 88%(7/8)가 리포트 2건 100%(1/1)보다 위여야 한다.
  it('다수 리포트 88%(7/8) 가 1~2건 100%(1/1) 보다 높다', () => {
    expect(predictionScore(7, 8)!).toBeGreaterThan(predictionScore(1, 1)!)
    expect(predictionScore(7, 8)!).toBeGreaterThan(predictionScore(2, 2)!)
  })
})
