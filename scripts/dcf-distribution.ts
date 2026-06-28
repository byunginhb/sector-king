/* DCF 실데이터 분포 점검(일회성). 실행: pnpm exec tsx scripts/dcf-distribution.ts */
import Database from 'better-sqlite3'
import { computeDcf } from '@/lib/dcf'
import { toUsd } from '@/lib/currency'

const db = new Database('data/hegemony.db', { readonly: true })

const rows = db
  .prepare(
    `SELECT cs.ticker, cs.free_cashflow AS fcf, cs.revenue_growth AS rg,
            cs.beta, cs.debt_to_equity AS de, cp.sector AS sector,
            ds.price AS price, ds.market_cap AS mc
     FROM company_scores cs
     LEFT JOIN company_profiles cp ON cp.ticker = cs.ticker
     LEFT JOIN daily_snapshots ds ON ds.ticker = cs.ticker
       AND ds.date = (SELECT MAX(date) FROM daily_snapshots WHERE ticker = cs.ticker)`
  )
  .all() as Array<{
  ticker: string
  fcf: number | null
  rg: number | null
  beta: number | null
  de: number | null
  sector: string | null
  price: number | null
  mc: number | null
}>

const scores: number[] = []
const upsides: number[] = []
const reasons: Record<string, number> = {}
const buckets = [0, 0, 0, 0, 0] // [0-20),[20-40),[40-60),[60-80),[80-100]
let zero = 0
let hundred = 0
let krSample: { ticker: string; upsidePct: number; intrinsicUsd: number; priceUsd: number } | null = null

for (const r of rows) {
  const priceUsd = r.price != null ? toUsd(r.price, r.ticker) : null
  const marketCapUsd = r.mc != null ? toUsd(r.mc, r.ticker) : null
  const res = computeDcf({
    freeCashflow: r.fcf,
    revenueGrowth: r.rg,
    beta: r.beta,
    debtToEquity: r.de,
    marketCapNative: r.mc,
    priceNative: r.price,
    marketCapUsd,
    priceUsd,
    intrinsicToUsd: (x) => toUsd(x, r.ticker),
    sector: r.sector,
  })
  if (res.dcfScore === null) {
    reasons[res.dcfReason ?? 'null'] = (reasons[res.dcfReason ?? 'null'] ?? 0) + 1
    continue
  }
  scores.push(res.dcfScore)
  if (res.dcfUpsidePct != null) upsides.push(res.dcfUpsidePct)
  if (res.dcfScore === 0) zero++
  if (res.dcfScore === 100) hundred++
  const b = Math.min(Math.floor(res.dcfScore / 20), 4)
  buckets[b]++
  if (!krSample && r.ticker.endsWith('.KS') && res.dcfUpsidePct != null) {
    krSample = {
      ticker: r.ticker,
      upsidePct: res.dcfUpsidePct,
      intrinsicUsd: res.dcfIntrinsicUsd!,
      priceUsd: priceUsd!,
    }
  }
}

const n = scores.length
const mean = n ? scores.reduce((a, b) => a + b, 0) / n : 0
const sorted = [...scores].sort((a, b) => a - b)
const median = n ? sorted[Math.floor(n / 2)] : 0

console.log('총 종목:', rows.length, '/ DCF 산출:', n)
console.log('제외 사유:', reasons)
console.log('평균:', mean.toFixed(1), '중앙값:', median.toFixed(1))
console.log('정확히 0점:', zero, '/ 정확히 100점:', hundred)
console.log('버킷 [0-20)[20-40)[40-60)[60-80)[80-100]:', buckets)
const up = [...upsides].sort((a, b) => a - b)
const pct = (p: number) => up[Math.floor((up.length - 1) * p)]
console.log(
  'upside 분위수 p5/p10/p25/p50/p75/p90/p95:',
  [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].map((p) => pct(p).toFixed(2)).join(' / ')
)
console.log('KR 손계산 샘플:', krSample)
if (krSample) {
  const manual = (krSample.intrinsicUsd - krSample.priceUsd) / krSample.priceUsd
  console.log('  재계산 upside =', manual.toFixed(6), '/ 응답 upside =', krSample.upsidePct.toFixed(6))
}
