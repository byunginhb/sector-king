import { describe, it, expect } from 'vitest'
import {
  weightedPickScore,
  PICK_WEIGHTS,
  PICK_PROFILES,
} from '@/lib/pick-profile'

describe('PICK_WEIGHTS', () => {
  it('모든 프로필 가중치 합 = 1', () => {
    for (const p of PICK_PROFILES) {
      const w = PICK_WEIGHTS[p]
      expect(w.short + w.long + w.dcf).toBeCloseTo(1, 10)
    }
  })
})

describe('weightedPickScore', () => {
  it('세 점수 모두 있으면 가중평균', () => {
    // balanced: 0.35·80 + 0.4·60 + 0.25·40 = 28+24+10 = 62
    expect(weightedPickScore(80, 60, 40, 'balanced')).toBeCloseTo(62, 10)
  })

  it('DCF 결손 → 가중치 재분배(단기·장기만 재정규화)', () => {
    // long 프로필 w = {short:0.15, long:0.5, dcf:0.35}
    // DCF null → 유효 0.15+0.5=0.65. (0.15·80 + 0.5·60)/0.65 = (12+30)/0.65 = 64.615...
    expect(weightedPickScore(80, 60, null, 'long')).toBeCloseTo(42 / 0.65, 10)
  })

  it('단기만 있으면 그 값', () => {
    expect(weightedPickScore(77, null, null, 'short')).toBeCloseTo(77, 10)
  })

  it('세 점수 모두 결손이면 null', () => {
    expect(weightedPickScore(null, null, null, 'balanced')).toBeNull()
  })

  it('프로필에 따라 결과가 달라진다(가중치 반영)', () => {
    // 단기 점수만 높은 종목: 단기 프로필 > 장기 프로필
    const s = weightedPickScore(90, 40, 40, 'short')
    const l = weightedPickScore(90, 40, 40, 'long')
    expect(s).toBeGreaterThan(l as number)
  })
})
