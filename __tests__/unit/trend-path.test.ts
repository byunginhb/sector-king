import { describe, it, expect } from 'vitest'
import { buildTrendPath } from '@/lib/trend-path'

/** path 안의 모든 좌표쌍에서 y 값만 뽑는다 (베지어 제어점 포함) */
function allY(d: string): number[] {
  return [...d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map((m) => parseFloat(m[2]))
}

describe('buildTrendPath', () => {
  it('점이 2개 미만이면 null', () => {
    expect(buildTrendPath([])).toBeNull()
    expect(buildTrendPath([1])).toBeNull()
  })

  it('x 는 0 에서 100 까지 균등 분할', () => {
    const { points } = buildTrendPath([0, 1, 2])!
    expect(points.map((p) => p.x)).toEqual([0, 50, 100])
  })

  it('상승 시계열은 y 가 감소(위로 감)', () => {
    const { points } = buildTrendPath([0, 5, 10])!
    expect(points[0].y).toBeGreaterThan(points[1].y)
    expect(points[1].y).toBeGreaterThan(points[2].y)
  })

  it('도메인에 0 을 포함해 하락분이 시작선 아래로 그려진다', () => {
    // 값이 전부 음수여도 첫 점(0)은 상단(pad=6), 최저점은 하단(94)
    const { points } = buildTrendPath([0, -3, -10])!
    expect(points[0].y).toBeCloseTo(6, 1)
    expect(points[2].y).toBeCloseTo(94, 1)
  })

  it('전부 같은 값이면 0 나눗셈 없이 중앙 수평선', () => {
    const { points } = buildTrendPath([0, 0, 0])!
    expect(points.every((p) => Number.isFinite(p.y) && p.y === points[0].y)).toBe(true)
  })

  it('곡선 명령(C)으로 라운딩된다', () => {
    expect(buildTrendPath([0, 5, 3, 8])!.line).toContain('C')
  })

  it('급반전 구간에서도 제어점이 viewBox 를 벗어나지 않는다(오버슈트 없음)', () => {
    // 톱니형 — Catmull-Rom 이었다면 봉우리 밖으로 튀는 모양
    const { line } = buildTrendPath([0, 100, 0, 100, 0, 100])!
    const ys = allY(line)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(6 - 0.01)
    expect(Math.max(...ys)).toBeLessThanOrEqual(94 + 0.01)
  })

  it('단조 구간의 제어점은 양 끝 값 사이에 머문다', () => {
    const { line, points } = buildTrendPath([0, 1, 2, 3])!
    const ys = allY(line)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(points[3].y - 0.01)
    expect(Math.max(...ys)).toBeLessThanOrEqual(points[0].y + 0.01)
  })

  it('area 는 선을 바닥까지 닫는다', () => {
    expect(buildTrendPath([0, 1])!.area.endsWith('L100,100L0,100Z')).toBe(true)
  })
})
