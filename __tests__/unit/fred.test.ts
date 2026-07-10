import { describe, it, expect } from 'vitest'
import {
  etWallClockToKst,
  mapReleaseDatesToEvents,
  FRED_RELEASE_MAP,
  type FredReleaseDate,
} from '@/lib/economic-calendar/fred'

describe('etWallClockToKst — DST-aware ET→KST 변환', () => {
  it('여름(EDT, UTC-4): 08:30 ET → 같은 날 21:30 KST', () => {
    // 2026-07-15 는 미 동부 서머타임(EDT). 08:30 EDT = 12:30 UTC = 21:30 KST.
    expect(etWallClockToKst('2026-07-15', '08:30')).toEqual({
      eventDate: '2026-07-15',
      eventTime: '21:30',
    })
  })

  it('겨울(EST, UTC-5): 08:30 ET → 같은 날 22:30 KST', () => {
    // 2026-01-15 는 표준시(EST). 08:30 EST = 13:30 UTC = 22:30 KST.
    expect(etWallClockToKst('2026-01-15', '08:30')).toEqual({
      eventDate: '2026-01-15',
      eventTime: '22:30',
    })
  })

  it('오후 발표(14:00 ET, 겨울)는 KST 익일로 롤오버', () => {
    // 14:00 EST = 19:00 UTC = 익일 04:00 KST.
    expect(etWallClockToKst('2026-01-15', '14:00')).toEqual({
      eventDate: '2026-01-16',
      eventTime: '04:00',
    })
  })
})

describe('mapReleaseDatesToEvents — 릴리스 매핑', () => {
  const now = '2026-07-10T00:00:00.000Z'

  it('매핑된 릴리스만 이벤트로 변환하고, 미매핑은 스킵', () => {
    const input: FredReleaseDate[] = [
      { release_id: 10, release_name: 'Consumer Price Index', date: '2026-07-15' },
      { release_id: 99999, release_name: 'Unmapped Release', date: '2026-07-16' },
    ]
    const rows = mapReleaseDatesToEvents(input, now)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      source: 'fred',
      external_id: 'fred:10:2026-07-15',
      country: 'US',
      category: 'indicator',
      importance: 'high',
      title: FRED_RELEASE_MAP[10].titleKo,
      event_date: '2026-07-15',
      event_time: '21:30',
      actual: null,
      forecast: null,
      previous: null,
      updated_at: now,
    })
  })

  it('멱등 external_id = fred:{release_id}:{etDate}, 중복은 1건만', () => {
    const input: FredReleaseDate[] = [
      { release_id: 50, release_name: 'Employment Situation', date: '2026-02-06' },
      { release_id: 50, release_name: 'Employment Situation', date: '2026-02-06' },
    ]
    const rows = mapReleaseDatesToEvents(input, now)
    expect(rows).toHaveLength(1)
    expect(rows[0].external_id).toBe('fred:50:2026-02-06')
  })
})
