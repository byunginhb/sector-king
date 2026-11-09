import { describe, expect, it } from 'vitest'
import { calculateSettlement, semanticHash } from '@/lib/weekly-match/settlement'
import { pickSchema, roundSchema, settleSchema, type RoundInput, type SettlementInput } from '@/lib/weekly-match/validation'

const source = 'https://query1.finance.yahoo.com/v8/finance/chart/000001.KS'
const quote = (ticker: string, close: number) => ({ ticker, name: ticker, priceDate: '2026-11-06', close, volume: 100, source, retrievedAt: '2026-11-07T00:00:00Z' })
const round: RoundInput = {
  id: 'kr-2026-11-09', title: '은행 vs 조선', baseDate: '2026-11-06', endDate: '2026-11-13',
  opensAt: '2026-11-07T01:00:00Z', closesAt: '2026-11-09T00:00:00Z', endsAt: '2026-11-13T09:00:00Z',
  calendarSource: 'https://global.krx.co.kr/', calendarVerifiedAt: '2026-11-07T00:00:00Z',
  left: { id: 'banks', name: '은행', tickers: [quote('000001.KS', 100), quote('000002.KS', 200)] },
  right: { id: 'ships', name: '조선', tickers: [quote('000003.KS', 100)] },
}
const input: SettlementInput = {
  operation: 'settle', roundId: round.id,
  prices: [
    { ticker: '000001.KS', close: 110, volume: 100, source, priceDate: round.endDate, retrievedAt: '2026-11-13T09:01:00Z', corporateAction: false },
    { ticker: '000002.KS', close: 240, volume: 100, source, priceDate: round.endDate, retrievedAt: '2026-11-13T09:01:00Z', corporateAction: false },
    { ticker: '000003.KS', close: 112, volume: 100, source, priceDate: round.endDate, retrievedAt: '2026-11-13T09:01:00Z', corporateAction: false },
  ],
}
const now = new Date('2026-11-13T10:00:00Z')

describe('weekly match evidence and settlement', () => {
  it('accepts the frozen KR roster and rejects extra pick identity fields', () => {
    expect(roundSchema.safeParse(round).success).toBe(true)
    expect(pickSchema.safeParse({ roundId: round.id, side: 'left', userId: 'other' }).success).toBe(false)
    expect(pickSchema.safeParse({ roundId: round.id, side: 'left' }).success).toBe(true)
  })
  it('rejects invalid dates, duplicated rosters, late cutoff and unverified base evidence', () => {
    expect(roundSchema.safeParse({ ...round, baseDate: '2026-02-30' }).success).toBe(false)
    expect(roundSchema.safeParse({ ...round, right: round.left }).success).toBe(false)
    expect(roundSchema.safeParse({ ...round, closesAt: '2026-11-09T01:00:00Z' }).success).toBe(false)
    const changed = structuredClone(round)
    changed.left.tickers[0].priceDate = '2026-11-05'
    expect(roundSchema.safeParse(changed).success).toBe(false)
    changed.left.tickers[0] = { ...round.left.tickers[0], close: Infinity }
    expect(roundSchema.safeParse(changed).success).toBe(false)
  })
  it('uses each stock price return at equal weight and rounds six decimal places', () => {
    expect(calculateSettlement(round, input, now)).toMatchObject({ outcome: 'left', leftReturn: 15, rightReturn: 12 })
    const tie = structuredClone(input)
    tie.prices[2].close = 115
    expect(calculateSettlement(round, tie, now).outcome).toBe('tie')
  })
  it('never silently removes missing prices or corporate actions', () => {
    const missing = { ...input, prices: input.prices.slice(1) }
    expect(calculateSettlement(round, missing, now)).toMatchObject({ outcome: 'pending', leftReturn: null })
    expect(calculateSettlement(round, missing, new Date('2026-11-20T09:00:00Z')).outcome).toBe('void')
    const action = structuredClone(input)
    action.prices[0].corporateAction = true
    expect(calculateSettlement(round, action, now).outcome).toBe('pending')
    expect(calculateSettlement(round, { ...input, voidReason: '원천 데이터 정정 불가' }, now).outcome).toBe('void')
  })
  it('rejects early settlement, wrong price dates, unknown tickers and future retrieval', () => {
    expect(() => calculateSettlement(round, input, new Date(round.closesAt))).toThrow('ROUND_NOT_ENDED')
    for (const change of [{ priceDate: '2026-11-12' }, { ticker: '999999.KS' }, { retrievedAt: '2026-11-14T00:00:00Z' }]) {
      const changed = structuredClone(input)
      Object.assign(changed.prices[0], change)
      expect(() => calculateSettlement(round, changed, now)).toThrow('INVALID_PRICE_EVIDENCE')
    }
  })
  it('validates strict ingestion input and semantic idempotency includes price, date, action and source', () => {
    expect(settleSchema.safeParse(input).success).toBe(true)
    expect(settleSchema.safeParse({ ...input, userId: 'bad' }).success).toBe(false)
    expect(settleSchema.safeParse({ ...input, prices: [input.prices[0], input.prices[0]] }).success).toBe(false)
    const changed = structuredClone(input)
    changed.prices[0].retrievedAt = '2026-11-13T09:02:00Z'
    changed.correctionReason = '확인 시각만 갱신'
    expect(semanticHash(changed)).toBe(semanticHash(input))
    changed.prices[0].close = 111
    expect(semanticHash(changed)).not.toBe(semanticHash(input))
  })
  it('accepts automatic retries without manual overrides and excludes intent from the evidence hash', () => {
    expect(settleSchema.safeParse({ ...input, automatic: true }).success).toBe(true)
    expect(settleSchema.safeParse({ ...input, automatic: 'true' }).success).toBe(false)
    expect(settleSchema.safeParse({ ...input, automatic: true, voidReason: '수동 무효화 사유' }).success).toBe(false)
    expect(settleSchema.safeParse({ ...input, automatic: true, correctionReason: '수동 정정 사유' }).success).toBe(false)
    expect(semanticHash({ ...input, automatic: true })).toBe(semanticHash(input))
  })
})
