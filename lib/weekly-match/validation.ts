import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, '유효한 날짜가 필요합니다')
const instant = z.iso.datetime({ offset: true })
const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/)
const ticker = z.string().regex(/^\d{6}\.K[QS]$/)
const positive = z.number().positive().max(1e12)
const evidence = {
  ticker,
  priceDate: date,
  source: z.url().max(2000).refine((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'].includes(url.hostname)
  }),
  retrievedAt: instant,
}
const baseQuote = z.object({
  ...evidence,
  name: z.string().trim().min(1).max(100),
  close: positive,
  volume: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}).strict()
const sector = z.object({ id, name: z.string().trim().min(1).max(80), tickers: z.array(baseQuote).min(1).max(100) }).strict()

export const pickSchema = z.object({ roundId: id, side: z.enum(['left', 'right']) }).strict()
export const roundSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  baseDate: date,
  endDate: date,
  opensAt: instant,
  closesAt: instant,
  endsAt: instant,
  calendarSource: z.url().max(2000).refine((value) => new URL(value).protocol === 'https:'),
  calendarVerifiedAt: instant,
  left: sector,
  right: sector,
}).strict().superRefine((round, ctx) => {
  const quotes = [...round.left.tickers, ...round.right.tickers]
  const baseClose = Date.parse(`${round.baseDate}T15:30:00+09:00`)
  const start = Date.parse(round.opensAt)
  const cutoff = Date.parse(round.closesAt)
  const end = Date.parse(round.endsAt)
  const endDate = new Date(end + 9 * 3600_000).toISOString().slice(0, 10)
  const cutoffKst = new Date(cutoff + 9 * 3600_000).toISOString()
  if (!(round.baseDate < round.endDate && baseClose <= start && start < cutoff && cutoff < end && end >= Date.parse(`${round.endDate}T15:30:00+09:00`) && endDate === round.endDate && cutoffKst.slice(11, 19) <= '09:00:00')) {
    ctx.addIssue({ code: 'custom', message: '라운드 거래일·마감 시간이 올바르지 않습니다' })
  }
  if (round.left.id === round.right.id || new Set(quotes.map((quote) => quote.ticker)).size !== quotes.length) {
    ctx.addIssue({ code: 'custom', message: '섹터와 구성 종목은 중복될 수 없습니다' })
  }
  for (const quote of quotes) {
    if (quote.priceDate !== round.baseDate || Date.parse(quote.retrievedAt) < baseClose || Date.parse(quote.retrievedAt) > start) {
      ctx.addIssue({ code: 'custom', message: '기준 종가의 날짜·수집 시각이 올바르지 않습니다' })
    }
  }
})

export const finalQuoteSchema = z.object({
  ...evidence,
  close: positive.nullable(),
  volume: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  corporateAction: z.boolean(),
}).strict()
export const settleSchema = z.object({
  operation: z.literal('settle'),
  roundId: id,
  prices: z.array(finalQuoteSchema).max(200),
  correctionReason: z.string().trim().min(5).max(500).optional(),
  voidReason: z.string().trim().min(5).max(500).optional(),
}).strict().superRefine((input, ctx) => {
  if (new Set(input.prices.map((quote) => quote.ticker)).size !== input.prices.length) {
    ctx.addIssue({ code: 'custom', message: '정산 종목은 중복될 수 없습니다' })
  }
})
export const publishSchema = z.object({ operation: z.literal('publish'), round: roundSchema }).strict()
export const syncSchema = z.union([publishSchema, settleSchema])

export type RoundInput = z.infer<typeof roundSchema>
export type SettlementInput = z.infer<typeof settleSchema>
