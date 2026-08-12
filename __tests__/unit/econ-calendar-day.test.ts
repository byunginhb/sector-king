import { describe, it, expect } from 'vitest'
import { addDays, swipeDelta } from '@/lib/econ-calendar'

describe('swipeDelta', () => {
  it('왼쪽으로 밀면 다음 날, 오른쪽이면 이전 날', () => {
    expect(swipeDelta(-80, 5)).toBe(1)
    expect(swipeDelta(80, -5)).toBe(-1)
  })

  it('임계값 미만(탭·흔들림)은 무시', () => {
    expect(swipeDelta(-47, 0)).toBe(0)
    expect(swipeDelta(10, 0)).toBe(0)
  })

  it('세로 이동이 더 크면(페이지 스크롤) 무시', () => {
    expect(swipeDelta(-60, 120)).toBe(0)
  })
})

describe('addDays', () => {
  it('월·연 경계를 넘어간다', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('윤년 2월을 처리한다', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})
