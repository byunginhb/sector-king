import { describe, it, expect } from 'vitest'
import { achievementRate } from '@/lib/analyst-consensus/accuracy'
import { achievementTone } from '@/components/analysts/ui'

/**
 * 목표가 도달률 = (현재가 − 발표일가) / (목표가 − 발표일가).
 * 100% 초과·음수가 **정상적으로** 나오는 지표라, 화면이 그 구간을 구분해
 * 보여주지 않으면 340% 같은 값이 오독된다(#45).
 */
describe('achievementRate — 산식', () => {
  it('목표가에 정확히 도달하면 1(=100%)', () => {
    expect(achievementRate(100, 120, 120)).toBe(1)
  })

  it('절반 왔으면 0.5', () => {
    expect(achievementRate(100, 110, 120)).toBe(0.5)
  })

  it('목표가를 넘어서면 1을 초과한다 (상한 없음)', () => {
    expect(achievementRate(100, 140, 120)).toBe(2)
  })

  it('반대 방향으로 움직이면 음수다', () => {
    expect(achievementRate(100, 90, 120)).toBe(-0.5)
  })

  it('하향 목표(목표가 < 발표일가)에서도 부호 규칙이 같다', () => {
    // 목표 90 으로 내렸고 실제로 95 까지 내려왔다 = 절반 진행.
    expect(achievementRate(100, 95, 90)).toBe(0.5)
    // 반대로 올랐다면 음수.
    expect(achievementRate(100, 105, 90)).toBe(-0.5)
  })

  it('목표가 = 발표일가면 분모 0 이라 null (0 이나 Infinity 로 떨어뜨리지 않는다)', () => {
    expect(achievementRate(100, 110, 100)).toBe(null)
  })

  it('주가가 없으면 null', () => {
    expect(achievementRate(null, 110, 120)).toBe(null)
    expect(achievementRate(100, null, 120)).toBe(null)
  })
})

describe('achievementTone — 구간별 색', () => {
  it('목표 돌파(≥100%)는 success', () => {
    expect(achievementTone(1)).toBe('text-success')
    expect(achievementTone(3.4)).toBe('text-success')
  })

  it('진행 중(0~100%)은 중립색', () => {
    expect(achievementTone(0)).toBe('text-foreground')
    expect(achievementTone(0.5)).toBe('text-foreground')
    expect(achievementTone(0.99)).toBe('text-foreground')
  })

  it('반대 방향(음수)은 danger', () => {
    expect(achievementTone(-0.01)).toBe('text-danger')
    expect(achievementTone(-2)).toBe('text-danger')
  })

  it('값이 없으면 흐린 색', () => {
    expect(achievementTone(null)).toBe('text-muted-foreground')
  })
})
