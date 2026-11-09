import { createHash } from 'node:crypto'
import type { RoundInput, SettlementInput } from './validation'

export function semanticHash(input: unknown): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).filter(([key]) => !['retrievedAt', 'correctionReason', 'automatic'].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]))
    }
    return value
  }
  return createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex')
}

export function calculateSettlement(round: RoundInput, input: SettlementInput, now = new Date()) {
  if (now.getTime() < Date.parse(round.endsAt)) throw new Error('ROUND_NOT_ENDED')
  const all = [...round.left.tickers, ...round.right.tickers]
  const known = new Set(all.map((quote) => quote.ticker))
  if (input.prices.some((quote) => !known.has(quote.ticker) || quote.priceDate !== round.endDate || Date.parse(quote.retrievedAt) < Date.parse(round.endsAt) || Date.parse(quote.retrievedAt) > now.getTime())) {
    throw new Error('INVALID_PRICE_EVIDENCE')
  }
  const prices = new Map(input.prices.map((quote) => [quote.ticker, quote]))
  const incomplete = all.some((quote) => {
    const final = prices.get(quote.ticker)
    return !final || final.close === null || final.volume === null || final.corporateAction
  })
  if (input.voidReason || incomplete) {
    const expired = now.getTime() >= Date.parse(round.endsAt) + 7 * 86400_000
    return { outcome: input.voidReason || expired ? 'void' as const : 'pending' as const, leftReturn: null, rightReturn: null, reason: input.voidReason ?? '종가 결측·거래정지·기업행사 확인 중' }
  }
  const average = (quotes: RoundInput['left']['tickers']) => {
    const value = quotes.reduce((sum, quote) => sum + (prices.get(quote.ticker)!.close! / quote.close - 1) * 100, 0) / quotes.length
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 1e6) throw new Error('UNSAFE_RETURN')
    return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 1e6) / 1e6
  }
  const leftReturn = average(round.left.tickers)
  const rightReturn = average(round.right.tickers)
  return { outcome: leftReturn === rightReturn ? 'tie' as const : leftReturn > rightReturn ? 'left' as const : 'right' as const, leftReturn, rightReturn, reason: input.correctionReason ?? null }
}
