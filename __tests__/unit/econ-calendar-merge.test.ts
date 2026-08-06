import { describe, it, expect } from 'vitest'
import { compareEvents, resolveCategory } from '@/lib/econ-calendar'
import type { EconomicEvent } from '@/types'

function ev(overrides: Partial<EconomicEvent> = {}): EconomicEvent {
  return {
    id: 'x',
    country: 'US',
    category: 'indicator',
    title: '테스트',
    titleEn: null,
    dateKst: '2026-08-10',
    time: '21:30',
    importance: 'medium',
    actual: null,
    forecast: null,
    previous: null,
    unit: null,
    source: null,
    sourceUrl: null,
    ...overrides,
  }
}

describe('compareEvents — 지표+실적 크로스-스토어 정렬', () => {
  it('날짜가 최우선', () => {
    const a = ev({ id: 'a', dateKst: '2026-08-11', importance: 'high' })
    const b = ev({ id: 'b', dateKst: '2026-08-10', importance: 'low' })
    expect([a, b].sort(compareEvents).map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('같은 날에는 중요도가 시각보다 우선 (칸당 2건 그리드에서 대형주/주요지표를 지킨다)', () => {
    const early = ev({ id: 'early', time: '09:00', importance: 'low' })
    const late = ev({ id: 'late', time: '23:00', importance: 'high' })
    expect([early, late].sort(compareEvents).map((e) => e.id)).toEqual([
      'late',
      'early',
    ])
  })

  it('중요도가 같으면 지표가 실적보다 앞 (실적 수백 건이 고용보고서를 칸 밖으로 밀지 못하게)', () => {
    const earnings = ev({
      id: 'earnings',
      category: 'earnings',
      time: '05:00',
      importance: 'high',
    })
    const indicator = ev({
      id: 'indicator',
      category: 'indicator',
      time: '21:30',
      importance: 'high',
    })
    expect([earnings, indicator].sort(compareEvents).map((e) => e.id)).toEqual([
      'indicator',
      'earnings',
    ])
  })

  it('중요도·카테고리가 같으면 시각 오름차순, 종일(null)은 마지막', () => {
    const allDay = ev({ id: 'allDay', time: null })
    const noon = ev({ id: 'noon', time: '12:00' })
    const morning = ev({ id: 'morning', time: '09:00' })
    expect([allDay, noon, morning].sort(compareEvents).map((e) => e.id)).toEqual([
      'morning',
      'noon',
      'allDay',
    ])
  })

  it('전부 같으면 id 로 안정적 순서 (두 소스 병합 순서에 의존하지 않는다)', () => {
    const a = ev({ id: 'aaa' })
    const b = ev({ id: 'bbb' })
    expect([b, a].sort(compareEvents).map((e) => e.id)).toEqual(['aaa', 'bbb'])
    expect([a, b].sort(compareEvents).map((e) => e.id)).toEqual(['aaa', 'bbb'])
  })
})

describe('resolveCategory — 폐기된 event 카테고리', () => {
  it('earnings/indicator 는 통과', () => {
    expect(resolveCategory(new URLSearchParams('category=earnings'))).toBe('earnings')
    expect(resolveCategory(new URLSearchParams('category=indicator'))).toBe('indicator')
  })

  it("제거된 'event' 는 all 로 폴백 (오래된 링크가 500 을 내지 않게)", () => {
    expect(resolveCategory(new URLSearchParams('category=event'))).toBe('all')
  })
})
