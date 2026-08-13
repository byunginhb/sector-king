import { describe, it, expect } from 'vitest'
import { __test } from '@/lib/ipo-calendar'
import { compareEvents, resolveCategory } from '@/lib/econ-calendar'
import type { EconomicEvent } from '@/types'

const { toEvent } = __test

function row(overrides: Partial<Parameters<typeof toEvent>[0]> = {}) {
  return {
    name: '니어스랩',
    eventType: 'subscription',
    eventDate: '2026-08-12',
    endDate: '2026-08-13',
    offerPrice: '41,200',
    priceBand: '30,000~41,200',
    detailUrl: 'https://www.38.co.kr/html/fund/?o=v&no=2303',
    ...overrides,
  }
}

describe('toEvent — ipo_calendar 행 → 캘린더 이벤트', () => {
  it('청약은 시작일 한 칸에 놓고 마감일을 제목에 단다', () => {
    const e = toEvent(row())
    expect(e.dateKst).toBe('2026-08-12')
    expect(e.title).toBe('니어스랩 공모청약 (~8.13)')
    expect(e.category).toBe('ipo')
    expect(e.country).toBe('KR')
    expect(e.time).toBeNull() // 종일 이벤트
  })

  it('당일 마감 청약에는 꼬리표를 붙이지 않는다', () => {
    expect(toEvent(row({ endDate: '2026-08-12' })).title).toBe('니어스랩 공모청약')
    expect(toEvent(row({ endDate: null })).title).toBe('니어스랩 공모청약')
  })

  it('확정공모가=실제, 희망밴드=예상 (원 단위)', () => {
    const e = toEvent(row())
    expect(e.actual).toBe('41,200')
    expect(e.forecast).toBe('30,000~41,200')
    expect(e.unit).toBe('원')
  })

  it('상장은 밴드를 싣지 않고 꼬리표도 없다', () => {
    const e = toEvent(
      row({ eventType: 'listing', eventDate: '2026-08-25', endDate: null, priceBand: null })
    )
    expect(e.title).toBe('니어스랩 신규상장')
    expect(e.forecast).toBeNull()
    expect(e.actual).toBe('41,200')
  })

  it('스팩은 중요도를 낮춰 월 그리드에서 사업회사 IPO 를 밀어내지 않는다', () => {
    expect(toEvent(row({ name: 'KB스팩34호' })).importance).toBe('low')
    expect(toEvent(row({ name: '엔에이치기업인수목적30호' })).importance).toBe('low')
    expect(toEvent(row({ name: '빅웨이브로보틱스' })).importance).toBe('medium')
  })

  it('id 는 종목·유형·날짜로 고유하다 (같은 종목의 청약/상장 충돌 방지)', () => {
    const sub = toEvent(row())
    const listing = toEvent(row({ eventType: 'listing', eventDate: '2026-08-25' }))
    expect(sub.id).not.toBe(listing.id)
  })

  it('sourceUrl 은 38 상세 절대 URL (EventPill 이 외부 링크로 새 탭 처리)', () => {
    expect(toEvent(row()).sourceUrl).toMatch(/^https:\/\/www\.38\.co\.kr\//)
  })
})

describe('ipo 카테고리 배선', () => {
  it('?category=ipo 가 화이트리스트를 통과한다', () => {
    expect(resolveCategory(new URLSearchParams('category=ipo'))).toBe('ipo')
  })

  it('같은 날·같은 중요도면 지표 → 공모주 → 실적 순 (건수의 역순)', () => {
    const base: EconomicEvent = {
      ...toEvent(row()),
      dateKst: '2026-08-12',
      importance: 'medium',
      time: null,
    }
    const ipo = { ...base, id: 'ipo', category: 'ipo' as const }
    const indicator = { ...base, id: 'indicator', category: 'indicator' as const }
    const earnings = { ...base, id: 'earnings', category: 'earnings' as const }
    expect([earnings, ipo, indicator].sort(compareEvents).map((e) => e.id)).toEqual([
      'indicator',
      'ipo',
      'earnings',
    ])
  })
})
