import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireUserApi: vi.fn(), createClient: vi.fn(), createAdminClient: vi.fn(), getWeeklyMatchRounds: vi.fn(), requireApiKey: vi.fn() }))
vi.mock('@/lib/auth/require-user-api', () => ({ requireUserApi: mocks.requireUserApi }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/weekly-match/server', () => ({ getWeeklyMatchRounds: mocks.getWeeklyMatchRounds, ENTRY_COLUMNS: 'round_id,side,updated_at' }))
vi.mock('@/lib/auth/require-api-key', () => ({ requireApiKey: mocks.requireApiKey }))
import { GET as publicGet } from '@/app/api/weekly-match/route'
import { GET as personalGet, POST as pick } from '@/app/api/me/weekly-match/route'
import { POST as sync } from '@/app/api/cron/weekly-match-sync/route'

const request = (body: unknown) => new Request('http://localhost/api/me/weekly-match', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireUserApi.mockResolvedValue({ ok: true, profile: { id: 'own-id' } })
  mocks.requireApiKey.mockReturnValue({ ok: true })
})

describe('weekly match API boundaries', () => {
  it('keeps unauthenticated personal errors private and skips data calls', async () => {
    mocks.requireUserApi.mockImplementation(async () => ({ ok: false, response: Response.json({ success: false }, { status: 401 }) }))
    for (const response of [await personalGet(), await pick(request({ roundId: 'a', side: 'left' }))]) {
      expect(response.status).toBe(401)
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    }
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  it('rejects caller supplied user IDs and malformed bodies', async () => {
    const response = await pick(request({ roundId: 'a', side: 'left', userId: 'victim' }))
    expect(response.status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  it('uses authenticated RPC identity and maps deadline conflicts', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: { round_id: 'a', side: 'left', updated_at: 'now', user_id: 'own-id' }, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'ROUND_CLOSED' } })
    mocks.createClient.mockResolvedValue({ rpc })
    const response = await pick(request({ roundId: 'a', side: 'left' }))
    expect(await response.json()).toEqual({ success: true, data: { entry: { roundId: 'a', side: 'left', updatedAt: 'now' } } })
    expect(rpc).toHaveBeenCalledWith('submit_weekly_match_pick', { p_round_id: 'a', p_side: 'left' })
    expect((await pick(request({ roundId: 'a', side: 'left' }))).status).toBe(409)
  })
  it('adds an explicit own user filter and strips identity from personal responses', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ round_id: 'a', side: 'left', updated_at: 'now', user_id: 'own-id' }], error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })
    const response = await personalGet()
    expect(eq).toHaveBeenCalledWith('user_id', 'own-id')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ success: true, data: { entries: [{ roundId: 'a', side: 'left', updatedAt: 'now' }] } })
  })
  it('projects public results without prices, audit evidence or user data', async () => {
    const sector = { id: 'sector', name: 'sector', tickers: [{ ticker: '000001.KS', name: 'stock', close: 10000 }] }
    const rounds = [{ id: 'a', title: 'match', base_date: '2026-11-06', end_date: '2026-11-13', opens_at: 'open', closes_at: 'close', ends_at: 'end', left_sector: sector, right_sector: sector, audit: { private: true } }]
    const settlements = [{ round_id: 'a', version: 2, outcome: 'left', left_return: '2', right_return: '1', reason: null, settled_at: 'settled', audit: { user_id: 'hidden' } }]
    const select = vi.fn().mockReturnValueOnce({ order: () => ({ limit: async () => ({ data: rounds, error: null }) }) }).mockReturnValueOnce({ in: () => ({ order: async () => ({ data: settlements, error: null }) }) })
    mocks.createAdminClient.mockReturnValue({ from: () => ({ select }) })
    const real = await vi.importActual<typeof import('@/lib/weekly-match/server')>('@/lib/weekly-match/server')
    const result = await real.getWeeklyMatchRounds()
    expect(result[0].settlement).toMatchObject({ version: 2, leftReturn: 2, rightReturn: 1 })
    expect(JSON.stringify(result)).not.toMatch(/"close":|audit|private|user_id|10000/)
    expect(select.mock.calls.flat().every((columns) => !columns.includes('*') && !columns.includes('audit'))).toBe(true)
  })
  it('returns a generic outage without provider or audit leaks', async () => {
    mocks.getWeeklyMatchRounds.mockRejectedValue(new Error('private audit and key'))
    const response = await publicGet()
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('private audit')
  })
  it('authenticates operator calls before input validation or admin creation', async () => {
    mocks.requireApiKey.mockReturnValue({ ok: false, response: Response.json({ success: false }, { status: 401 }) })
    expect((await sync(request({ operation: 'publish' }))).status).toBe(401)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
    expect(mocks.requireApiKey).toHaveBeenCalledWith(expect.any(Request), 'CRON_SECRET')
  })
  it('rejects strict operator input and hides operational database errors', async () => {
    expect((await sync(request({ operation: 'settle', roundId: 'a', prices: [], injected: true }))).status).toBe(400)
    mocks.createAdminClient.mockImplementation(() => { throw new Error('secret') })
    const response = await sync(request({ operation: 'settle', roundId: 'a', prices: [] }))
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('secret')
  })
})
