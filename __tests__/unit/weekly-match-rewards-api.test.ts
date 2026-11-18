import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireUserApi: vi.fn(), createClient: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@/lib/auth/require-user-api', () => ({ requireUserApi: mocks.requireUserApi }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
import { GET } from '@/app/api/me/weekly-match/rewards/route'

const settlement = (version = 2, outcome = 'left') => ({ version, outcome, left_return: outcome === 'pending' || outcome === 'void' ? null : '2.5', right_return: outcome === 'pending' || outcome === 'void' ? null : '1.5', reason: null, settled_at: '2026-11-13T09:05:00Z' })
const round = (id: string, settlements = [settlement()]) => ({ id, title: '은행 vs 조선', base_date: '2026-11-06', end_date: '2026-11-13', opens_at: '2026-11-06T09:00:00Z', closes_at: '2026-11-09T00:00:00Z', ends_at: '2026-11-13T09:00:00Z', left_sector: { id: 'banks', name: '은행', tickers: [] }, right_sector: { id: 'ships', name: '조선', tickers: [] }, weekly_match_settlements: settlements })

function clients(rounds = [round('r1')], options: { count?: number | null; countError?: boolean; roundError?: boolean; entryError?: boolean } = {}) {
  const roundCalls: { method: string; args: unknown[] }[] = []
  const entryCalls: { method: string; args: unknown[] }[] = []
  const adminFrom = vi.fn((table: string) => {
    expect(table).toBe('weekly_match_rounds')
    const query = Object.fromEntries(['select', 'gte', 'lt', 'order', 'limit'].map((method) => [method, (...args: unknown[]) => { roundCalls.push({ method, args }); return query }])) as Record<string, (...args: unknown[]) => unknown>
    query.range = vi.fn(async (...args: unknown[]) => {
      roundCalls.push({ method: 'range', args })
      return { data: options.roundError ? null : rounds.slice(Number(args[0]), Number(args[1]) + 1), error: options.roundError ? { message: 'secret provider error' } : null }
    })
    return query
  })
  const userFrom = vi.fn((table: string) => {
    expect(table).toBe('weekly_match_entries')
    let head = false
    let ids: string[] = []
    const query = {
      select: vi.fn((...args: unknown[]) => { entryCalls.push({ method: 'select', args }); head = Boolean((args[1] as { head?: boolean } | undefined)?.head); return query }),
      eq: vi.fn((...args: unknown[]) => { entryCalls.push({ method: 'eq', args }); return query }),
      in: vi.fn((column: string, values: string[]) => { entryCalls.push({ method: 'in', args: [column, values] }); ids = values; return query }),
      order: vi.fn((...args: unknown[]) => { entryCalls.push({ method: 'order', args }); return query }),
      range: vi.fn((...args: unknown[]) => { entryCalls.push({ method: 'range', args }); return query }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(head
        ? { count: options.count === undefined ? 1 : options.count, error: options.countError ? { message: 'private count error' } : null }
        : { data: ids.map((id) => ({ round_id: id, side: 'left', updated_at: '2026-11-08T00:00:00Z', user_id: 'own-id' })), error: options.entryError ? { message: 'private entry error' } : null })),
    }
    return query
  })
  mocks.createAdminClient.mockReturnValue({ from: adminFrom })
  mocks.createClient.mockResolvedValue({ from: userFrom })
  return { roundCalls, entryCalls, adminFrom, userFrom }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T21:00:00Z'))
  mocks.requireUserApi.mockResolvedValue({ ok: true, profile: { id: 'own-id' } })
})
afterEach(() => vi.useRealTimers())

describe('own weekly rewards API', () => {
  it('authenticates before either database client and keeps all responses private', async () => {
    mocks.requireUserApi.mockResolvedValue({ ok: false, response: Response.json({ success: false }, { status: 401 }) })
    const response = await GET()
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('uses authenticated own entries and admin rounds only, returning no private identity', async () => {
    const calls = clients()
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')
    const result = await response.json()
    expect(result).toMatchObject({ success: true, data: { rewards: { season: '2026-11', firstPick: true, participations: 1, points: 1, cards: [{ version: 2, outcome: 'hit', leftReturn: 2.5 }] } } })
    expect(calls.entryCalls.filter((call) => call.method === 'eq').every((call) => JSON.stringify(call.args) === JSON.stringify(['user_id', 'own-id']))).toBe(true)
    expect(calls.entryCalls).toContainEqual({ method: 'select', args: ['round_id', { count: 'exact', head: true }] })
    expect(calls.roundCalls).toContainEqual({ method: 'gte', args: ['end_date', '2026-11-01'] })
    expect(calls.roundCalls).toContainEqual({ method: 'lt', args: ['end_date', '2026-12-01'] })
    expect(calls.roundCalls).toContainEqual({ method: 'order', args: ['version', { referencedTable: 'weekly_match_settlements', ascending: false }] })
    expect(calls.roundCalls).toContainEqual({ method: 'limit', args: [1, { referencedTable: 'weekly_match_settlements' }] })
    expect(JSON.stringify(result)).not.toMatch(/own-id|user_id|updatedAt|audit|tickers/)
    expect(calls.roundCalls.filter((call) => call.method === 'select').every((call) => !String(call.args[0]).includes('*') && !String(call.args[0]).includes('audit'))).toBe(true)
  })

  it('selects the highest correction version without falling back from a latest pending result', async () => {
    clients([round('corrected', [settlement(2, 'pending'), settlement(1, 'left')])])
    const result = await (await GET()).json()
    expect(result.data.rewards).toMatchObject({ points: 0, pending: 1, cards: [] })
  })

  it('pages through more than 1000 rounds and limits each own-entry batch to 200 IDs', async () => {
    const calls = clients(Array.from({ length: 1001 }, (_, index) => round(`r${String(index).padStart(4, '0')}`)))
    const result = await (await GET()).json()
    expect(result.data.rewards).toMatchObject({ participations: 1001, points: 1001 })
    expect(result.data.rewards.cards).toHaveLength(1001)
    expect(calls.roundCalls.filter((call) => call.method === 'range').map((call) => call.args)).toEqual([[0, 199], [200, 399], [400, 599], [600, 799], [800, 999], [1000, 1199]])
    expect(calls.roundCalls.filter((call) => call.method === 'order' && call.args[0] === 'id')).toHaveLength(6)
    expect(calls.entryCalls.filter((call) => call.method === 'in').map((call) => (call.args[1] as string[]).length)).toEqual([200, 200, 200, 200, 200, 1])
  })

  it.each([{ countError: true }, { count: null }, { roundError: true }, { entryError: true }])('reports database failure rather than a false zero balance: %j', async (options) => {
    clients([round('r1')], options)
    const response = await GET()
    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toBe('Cookie')
    expect(await response.json()).toEqual({ success: false, error: '내 매치 보상을 불러올 수 없습니다' })
  })

  it('retains an earlier first-pick badge when there are no current-month rounds', async () => {
    clients([], { count: 3 })
    const result = await (await GET()).json()
    expect(result.data.rewards).toMatchObject({ firstPick: true, participations: 0, points: 0, cards: [] })
  })

  it('returns no badge for an empty real history and uses the KST year boundary for queries', async () => {
    vi.setSystemTime(new Date('2026-12-31T15:00:00Z'))
    const calls = clients([], { count: 0 })
    const result = await (await GET()).json()
    expect(result.data.rewards).toMatchObject({ season: '2027-01', firstPick: false, participations: 0, points: 0 })
    expect(calls.roundCalls).toContainEqual({ method: 'gte', args: ['end_date', '2027-01-01'] })
    expect(calls.roundCalls).toContainEqual({ method: 'lt', args: ['end_date', '2027-02-01'] })
  })
})
