import { describe, it, expect } from 'vitest'
import { squarify, textUnits, type TreemapInput } from '@/lib/treemap'

const W = 800
const H = 450

function overlaps(a: { x: number; y: number; w: number; h: number }, b: typeof a) {
  const eps = 1e-6
  return (
    a.x < b.x + b.w - eps &&
    b.x < a.x + a.w - eps &&
    a.y < b.y + b.h - eps &&
    b.y < a.y + a.h - eps
  )
}

describe('squarify', () => {
  const items: TreemapInput[] = [
    { id: 'a', value: 500 },
    { id: 'b', value: 250 },
    { id: 'c', value: 125 },
    { id: 'd', value: 75 },
    { id: 'e', value: 50 },
  ]

  it('면적이 value 에 비례한다', () => {
    const rects = squarify(items, 0, 0, W, H)
    const total = items.reduce((s, i) => s + i.value, 0)
    for (const r of rects) {
      const input = items.find((i) => i.id === r.id)!
      const expected = (input.value / total) * W * H
      expect(r.w * r.h).toBeCloseTo(expected, 4)
    }
  })

  it('전체 면적을 빈틈없이 채운다', () => {
    const rects = squarify(items, 0, 0, W, H)
    const sum = rects.reduce((s, r) => s + r.w * r.h, 0)
    expect(sum).toBeCloseTo(W * H, 4)
  })

  it('사각형이 서로 겹치지 않는다', () => {
    const rects = squarify(items, 0, 0, W, H)
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false)
      }
    }
  })

  it('모든 사각형이 부모 경계 안에 있다', () => {
    const rects = squarify(items, 10, 20, W, H)
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(10 - 1e-6)
      expect(r.y).toBeGreaterThanOrEqual(20 - 1e-6)
      expect(r.x + r.w).toBeLessThanOrEqual(10 + W + 1e-6)
      expect(r.y + r.h).toBeLessThanOrEqual(20 + H + 1e-6)
    }
  })

  it('오프셋(x, y)을 적용한다', () => {
    const rects = squarify([{ id: 'only', value: 1 }], 5, 7, 100, 50)
    expect(rects).toEqual([{ id: 'only', x: 5, y: 7, w: 100, h: 50 }])
  })

  it('값 내림차순으로 정렬해 큰 항목을 먼저 배치한다', () => {
    const rects = squarify(items, 0, 0, W, H)
    expect(rects[0].id).toBe('a')
    expect(rects[0].w * rects[0].h).toBeGreaterThan(rects[1].w * rects[1].h)
  })

  it('종횡비가 과도하게 길쭉하지 않다 (squarify 의 목적)', () => {
    const many: TreemapInput[] = Array.from({ length: 40 }, (_, i) => ({
      id: `s${i}`,
      value: 100 - i * 2,
    }))
    const rects = squarify(many, 0, 0, W, H)
    // 순진한 slice-and-dice 는 20:1 을 쉽게 넘긴다. squarify 는 한 자릿수 유지.
    for (const r of rects) {
      const ratio = Math.max(r.w / r.h, r.h / r.w)
      expect(ratio).toBeLessThan(10)
    }
  })

  it('value ≤ 0 인 항목을 제외한다', () => {
    const rects = squarify(
      [
        { id: 'pos', value: 10 },
        { id: 'zero', value: 0 },
        { id: 'neg', value: -5 },
      ],
      0,
      0,
      W,
      H
    )
    expect(rects.map((r) => r.id)).toEqual(['pos'])
    expect(rects[0].w * rects[0].h).toBeCloseTo(W * H, 4)
  })

  it('빈 입력·0 크기 사각형은 빈 배열', () => {
    expect(squarify([], 0, 0, W, H)).toEqual([])
    expect(squarify(items, 0, 0, 0, H)).toEqual([])
    expect(squarify(items, 0, 0, W, -1)).toEqual([])
    expect(squarify([{ id: 'a', value: 0 }], 0, 0, W, H)).toEqual([])
  })
})

describe('textUnits', () => {
  it('한글은 라틴보다 넓게 계산한다', () => {
    expect(textUnits('반도체')).toBeCloseTo(3.0, 5)
    expect(textUnits('abc')).toBeCloseTo(1.68, 5)
    expect(textUnits('반도체')).toBeGreaterThan(textUnits('abc'))
  })

  it('빈 문자열도 0 이 아니다 (0 나눗셈 방지)', () => {
    expect(textUnits('')).toBeGreaterThan(0)
  })
})
