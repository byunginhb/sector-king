import { describe, it, expect } from 'vitest'
import {
  computeShortScore,
  computeLongScore,
  computeUpsidePct,
  computeRankingScores,
  computeMomentumDelta,
  MOMENTUM_LOOKBACK,
  SHORT_WEIGHTS,
  LONG_WEIGHTS,
} from '@/lib/ranking-score'

// 가중치 합 sanity — 공식이 의도대로 1.0 인지(분모 재정규화의 기준).
describe('weights', () => {
  it('short weights sum to 1', () => {
    const sum =
      SHORT_WEIGHTS.momentum + SHORT_WEIGHTS.week52Position + SHORT_WEIGHTS.sentiment
    expect(sum).toBeCloseTo(1, 10)
  })
  it('long weights sum to 1', () => {
    const sum =
      LONG_WEIGHTS.profitability +
      LONG_WEIGHTS.growth +
      LONG_WEIGHTS.scale +
      LONG_WEIGHTS.upside
    expect(sum).toBeCloseTo(1, 10)
  })
})

describe('computeShortScore', () => {
  it('정상 산출: 모든 컴포넌트 중앙값이면 ~50', () => {
    // momentumDelta=0 → (0+10)/20 = 0.5, 52주 위치 0.5, sentiment 7.5/15 = 0.5
    const { score, momentumPartial } = computeShortScore({
      momentumDelta: 0,
      price: 50,
      week52High: 100,
      week52Low: 0,
      sentimentScore: 7.5,
    })
    expect(momentumPartial).toBe(false)
    expect(score).toBeCloseTo(50, 6)
  })

  it('최댓값 컴포넌트면 100 으로 클램프', () => {
    const { score } = computeShortScore({
      momentumDelta: 10, // (10+10)/20 = 1
      price: 100, // 위치 1
      week52High: 100,
      week52Low: 0,
      sentimentScore: 15, // 1
    })
    expect(score).toBeCloseTo(100, 6)
  })

  it('하한 초과 음수 모멘텀은 0 으로 클램프', () => {
    const { score } = computeShortScore({
      momentumDelta: -50, // (-50+10)/20 = -2 → clamp 0
      price: 0, // 위치 0
      week52High: 100,
      week52Low: 0,
      sentimentScore: 0,
    })
    expect(score).toBe(0)
  })

  it('모멘텀 결손(null)이면 momentumPartial=true, 잔여 가중치로 재배분', () => {
    const { score, momentumPartial } = computeShortScore({
      momentumDelta: null,
      price: 50,
      week52High: 100,
      week52Low: 0, // 위치 0.5
      sentimentScore: 7.5, // 0.5
    })
    expect(momentumPartial).toBe(true)
    // 둘 다 0.5 → 재배분해도 0.5 → 50
    expect(score).toBeCloseTo(50, 6)
  })

  it('가중치 재배분: 모멘텀만 결손 시 52주·심리 가중치 합으로 정규화', () => {
    // 52주 위치=1.0, 심리=0.0 → (0.30*1 + 0.25*0)/(0.30+0.25) = 0.5454.. *100
    const { score } = computeShortScore({
      momentumDelta: null,
      price: 100,
      week52High: 100,
      week52Low: 0,
      sentimentScore: 0,
    })
    const expected =
      (SHORT_WEIGHTS.week52Position * 1) /
      (SHORT_WEIGHTS.week52Position + SHORT_WEIGHTS.sentiment)
    expect(score).toBeCloseTo(expected * 100, 6)
  })

  it('밴드 폭 0 이면 52주 위치 결손(컴포넌트 제외)', () => {
    const { score } = computeShortScore({
      momentumDelta: 10, // 1
      price: 100,
      week52High: 100,
      week52Low: 100, // band 0 → null
      sentimentScore: 15, // 1
    })
    // momentum 1, sentiment 1 만 사용 → 100
    expect(score).toBeCloseTo(100, 6)
  })

  it('모든 컴포넌트 결손이면 null', () => {
    const { score } = computeShortScore({
      momentumDelta: null,
      price: null,
      week52High: null,
      week52Low: null,
      sentimentScore: null,
    })
    expect(score).toBeNull()
  })
})

describe('computeUpsidePct', () => {
  it('USD 환산값 기준 상승여력 비율', () => {
    expect(computeUpsidePct(120, 100)).toBeCloseTo(0.2, 10)
    expect(computeUpsidePct(80, 100)).toBeCloseTo(-0.2, 10)
  })
  it('price<=0 또는 결손이면 null', () => {
    expect(computeUpsidePct(120, 0)).toBeNull()
    expect(computeUpsidePct(null, 100)).toBeNull()
    expect(computeUpsidePct(120, null)).toBeNull()
  })
})

describe('computeLongScore', () => {
  it('정상 산출: 모든 컴포넌트 절반이면 ~50', () => {
    // profit 10/20, growth 15/30, scale 15/30 = 0.5, upside +10% → (0.1+0.2)/0.6=0.5
    const { score, upsidePct } = computeLongScore({
      profitabilityScore: 10,
      growthScore: 15,
      scaleScore: 15,
      targetUsd: 110,
      priceUsd: 100,
    })
    expect(upsidePct).toBeCloseTo(0.1, 10)
    expect(score).toBeCloseTo(50, 6)
  })

  it('상승여력 상한(+40% 이상) 100 으로 클램프', () => {
    const { score } = computeLongScore({
      profitabilityScore: 20,
      growthScore: 30,
      scaleScore: 30,
      targetUsd: 200, // +100% → clamp 1
      priceUsd: 100,
    })
    expect(score).toBeCloseTo(100, 6)
  })

  it('상승여력 하한(-20% 이하) 0 으로 클램프', () => {
    const { score, upsidePct } = computeLongScore({
      profitabilityScore: 0,
      growthScore: 0,
      scaleScore: 0,
      targetUsd: 50, // -50% → clamp 0
      priceUsd: 100,
    })
    expect(upsidePct).toBeCloseTo(-0.5, 10)
    expect(score).toBe(0)
  })

  it('targetMeanPrice 결손 시 상승여력 컴포넌트 제외·가중치 재배분', () => {
    // profit/growth/scale 모두 1.0, upside 결손 → 1.0 → 100
    const { score, upsidePct } = computeLongScore({
      profitabilityScore: 20,
      growthScore: 30,
      scaleScore: 30,
      targetUsd: null,
      priceUsd: 100,
    })
    expect(upsidePct).toBeNull()
    expect(score).toBeCloseTo(100, 6)
  })

  it('단일 컴포넌트만 유효해도 산출(재배분)', () => {
    // 수익성만 0.5, 나머지 결손 → 50
    const { score } = computeLongScore({
      profitabilityScore: 10,
      growthScore: null,
      scaleScore: null,
      targetUsd: null,
      priceUsd: null,
    })
    expect(score).toBeCloseTo(50, 6)
  })

  it('모든 컴포넌트 결손이면 null', () => {
    const { score } = computeLongScore({
      profitabilityScore: null,
      growthScore: null,
      scaleScore: null,
      targetUsd: null,
      priceUsd: null,
    })
    expect(score).toBeNull()
  })
})

describe('computeRankingScores (통합 진입점 — 일관성 SoT)', () => {
  it('short/long 을 동시 산출하고 개별 함수와 동일한 값', () => {
    const input = {
      momentumDelta: 5,
      price: 80,
      week52High: 100,
      week52Low: 0,
      sentimentScore: 12,
      profitabilityScore: 18,
      growthScore: 24,
      scaleScore: 21,
      targetUsd: 95,
      priceUsd: 80,
    }
    const combined = computeRankingScores(input)
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
    expect(combined.shortScore).toBe(short.score)
    expect(combined.longScore).toBe(long.score)
    expect(combined.momentumPartial).toBe(short.momentumPartial)
    expect(combined.upsidePct).toBe(long.upsidePct)
  })

  it('동일 입력 → 동일 출력(결정론적, SSR/CSR 일관)', () => {
    const input = {
      momentumDelta: -3,
      price: 42,
      week52High: 60,
      week52Low: 30,
      sentimentScore: 9,
      profitabilityScore: 12,
      growthScore: 8,
      scaleScore: 25,
      targetUsd: 50,
      priceUsd: 42,
    }
    expect(computeRankingScores(input)).toEqual(computeRankingScores(input))
  })

  it('산출값은 항상 0~100 범위(또는 null)', () => {
    const r = computeRankingScores({
      momentumDelta: 100,
      price: 999,
      week52High: 100,
      week52Low: 0,
      sentimentScore: 99,
      profitabilityScore: 999,
      growthScore: 999,
      scaleScore: 999,
      targetUsd: 9999,
      priceUsd: 1,
    })
    expect(r.shortScore).toBeLessThanOrEqual(100)
    expect(r.shortScore).toBeGreaterThanOrEqual(0)
    expect(r.longScore).toBeLessThanOrEqual(100)
    expect(r.longScore).toBeGreaterThanOrEqual(0)
  })
})

// 모멘텀 Δ 공유 함수 — 랭킹 API 와 종목 상세가 같은 산식을 쓰는지 보장(점수 일치 SoT).
describe('computeMomentumDelta — 점수 일치 SoT', () => {
  it('최신 − lookback 전 Δ 를 구한다', () => {
    // 길이 17, 마지막 90, 15거래일 전(인덱스 1) = 75 → Δ 15
    const series = [70, 75, ...Array(14).fill(80), 90]
    expect(series.length).toBe(MOMENTUM_LOOKBACK + 2)
    expect(computeMomentumDelta(series)).toBe(90 - 75)
  })

  it('lookback 이하 길이면 null(신규상장)', () => {
    expect(computeMomentumDelta(Array(MOMENTUM_LOOKBACK).fill(50))).toBeNull()
    expect(computeMomentumDelta(Array(MOMENTUM_LOOKBACK + 1).fill(50))).not.toBeNull()
  })

  it('결손(null) 지점은 0 으로 간주 — 행을 건너뛰지 않아 인덱스 정렬 유지', () => {
    const a = [null, ...Array(16).fill(60)] // 길이 17, 마지막 60, 15전(idx1)=60 → 0
    expect(computeMomentumDelta(a)).toBe(0)
  })

  it('두 입력 경로 동치 — API(원시 null 유지) == 위젯(total 매핑). lookback 지점에 null 포함', () => {
    // API 경로: smoothedScore 원시 시계열. lookback 지점(인덱스 1)에 null 을 둬 분기 경로를 실제로 친다.
    const apiSeries: (number | null)[] = [70, null, ...Array(13).fill(78), 80, 88]
    expect(apiSeries.length).toBe(MOMENTUM_LOOKBACK + 2)
    // 위젯 경로: insights total(=smoothed ?? 0) 매핑
    const widgetSeries = apiSeries.map((v) => v ?? 0)
    // 둘 다 같은 함수 → 같은 정책(null→0) → 동일 Δ (과거 H1: API 가 null 행을 건너뛰어 어긋났음)
    expect(computeMomentumDelta(apiSeries)).toBe(computeMomentumDelta(widgetSeries))
    expect(computeMomentumDelta(apiSeries)).toBe(88) // 최신 88 − (null→0)
  })
})
