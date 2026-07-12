import { describe, it, expect } from 'vitest'
import { shortScoreReason, longScoreReason } from '@/lib/score-reason'

describe('shortScoreReason', () => {
  it('세 요소를 데이터 값으로 요약한다', () => {
    const r = shortScoreReason({
      week52Position: 0.66,
      momentumDelta: 2,
      momentumPartial: false,
      sentimentNorm: 0.5,
    })
    expect(r).toContain('52주 위치 66%')
    expect(r).toContain('최근 흐름 상승세')
    expect(r).toContain('시장심리 중위권')
  })

  it('모멘텀 부족·심리 결손은 해당 항목을 생략/표기한다', () => {
    const r = shortScoreReason({
      week52Position: 0.2,
      momentumDelta: null,
      momentumPartial: true,
      sentimentNorm: null,
    })
    expect(r).toContain('52주 위치 20%')
    expect(r).toContain('최근 흐름 데이터 부족')
    expect(r).not.toContain('시장심리')
  })

  it('모든 입력이 결손이면 안내 문구', () => {
    const r = shortScoreReason({
      week52Position: null,
      momentumDelta: null,
      momentumPartial: false,
      sentimentNorm: null,
    })
    expect(r).toContain('데이터가 부족')
  })
})

describe('longScoreReason', () => {
  it('강도 표현 + 부호 포함 상승여력', () => {
    const r = longScoreReason({
      profitabilityNorm: 0.9,
      growthNorm: 0.5,
      scaleNorm: 0.7,
      upsidePct: 0.43,
    })
    expect(r).toContain('수익성 상위권')
    expect(r).toContain('성장성 중위권')
    expect(r).toContain('규모 상위권')
    expect(r).toContain('목표주가까지 +43%')
  })

  it('음수 상승여력은 부호를 유지한다', () => {
    const r = longScoreReason({
      profitabilityNorm: null,
      growthNorm: null,
      scaleNorm: null,
      upsidePct: -0.753,
    })
    expect(r).toContain('목표주가까지 -75%')
  })
})
