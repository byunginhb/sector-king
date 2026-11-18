import { describe, expect, it } from 'vitest'
import { calculateWeeklyMatchRewards, getWeeklyMatchSeason } from '@/lib/weekly-match/rewards'
import type { WeeklyMatchEntry, WeeklyMatchRound } from '@/lib/weekly-match/types'

const now = new Date('2026-11-30T15:00:00Z')
const round = (id: string, endDate = '2026-12-04', outcome: 'left' | 'right' | 'tie' | 'void' | null = 'left'): WeeklyMatchRound => ({
  id, title: `${id} 대진`, baseDate: '2026-11-27', endDate,
  opensAt: '2026-11-27T09:00:00Z', closesAt: '2026-11-30T00:00:00Z', endsAt: `${endDate}T09:00:00Z`,
  left: { id: 'banks', name: '은행', tickers: [] }, right: { id: 'ships', name: '조선', tickers: [] },
  settlement: outcome === null ? null : { version: 3, outcome, leftReturn: outcome === 'void' ? null : 2, rightReturn: outcome === 'void' ? null : 1, reason: null, settledAt: `${endDate}T09:01:00Z` },
})
const entry = (roundId: string, side: 'left' | 'right' = 'left'): WeeklyMatchEntry => ({ roundId, side, updatedAt: '2026-11-28T00:00:00Z' })

describe('weekly match real-user rewards', () => {
  it('uses the Korean calendar month including year rollover', () => {
    expect(getWeeklyMatchSeason(new Date('2026-11-30T14:59:59Z'))).toBe('2026-11')
    expect(getWeeklyMatchSeason(now)).toBe('2026-12')
    expect(getWeeklyMatchSeason(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01')
  })

  it('counts valid hits only and separates exclusions and pending results', () => {
    const rounds = [round('hit'), round('miss', undefined, 'right'), round('tie', undefined, 'tie'), round('void', undefined, 'void'), round('pending', undefined, null), round('unpicked')]
    const result = calculateWeeklyMatchRewards(rounds, ['hit', 'miss', 'tie', 'void', 'pending'].map((id) => entry(id)), true, now)
    expect(result).toMatchObject({ season: '2026-12', firstPick: true, participations: 5, points: 1, wins: 1, losses: 1, excluded: 2, pending: 1 })
    expect(result.cards.map((card) => card.outcome)).toEqual(['hit', 'miss', 'tie', 'void'])
    expect(result.cards[0]).toMatchObject({ roundId: 'hit', sideName: '은행', leftReturn: 2, version: 3 })
    expect(JSON.stringify(result)).not.toMatch(/user_id|email|updatedAt|tickers/)
  })

  it('assigns season by end date and preserves an older first-pick badge', () => {
    const result = calculateWeeklyMatchRewards([round('previous', '2026-11-30'), round('next', '2027-01-01')], [entry('previous'), entry('next')], true, now)
    expect(result).toMatchObject({ firstPick: true, participations: 0, points: 0, cards: [] })
  })

  it('recomputes corrected results and removes points while a latest result is pending', () => {
    const own = [entry('corrected', 'right')]
    expect(calculateWeeklyMatchRewards([round('corrected')], own, true, now).points).toBe(0)
    expect(calculateWeeklyMatchRewards([round('corrected', undefined, 'right')], own, true, now).points).toBe(1)
    expect(calculateWeeklyMatchRewards([round('corrected', undefined, null)], own, true, now)).toMatchObject({ points: 0, pending: 1, cards: [] })
    expect(calculateWeeklyMatchRewards([round('corrected', undefined, 'void')], own, true, now)).toMatchObject({ points: 0, excluded: 1 })
  })

  it('does not invent participation or a first-pick badge for empty real data', () => {
    expect(calculateWeeklyMatchRewards([], [], false, now)).toEqual({ season: '2026-12', firstPick: false, participations: 0, points: 0, wins: 0, losses: 0, excluded: 0, pending: 0, cards: [] })
  })
})
