import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { desc, inArray, and, eq } from 'drizzle-orm'
import * as schema from '../drizzle/schema'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')
const KRW_USD_RATE = Number(process.env.KRW_USD_RATE) || 1450
const TARGET_PERIODS = [1, 3, 7, 14, 30]

function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ')
}

function toUsd(value: number, ticker: string): number {
  return isKoreanTicker(ticker) ? value / KRW_USD_RATE : value
}

async function main() {
  const sqlite = new Database(DB_PATH, { readonly: true })
  const db = drizzle(sqlite, { schema })

  // 1. Get available dates
  const recentDates = await db
    .selectDistinct({ date: schema.dailySnapshots.date })
    .from(schema.dailySnapshots)
    .orderBy(desc(schema.dailySnapshots.date))
    .limit(40)

  const dates = recentDates
    .map((d) => d.date)
    .filter((d): d is string => d !== null)
    .reverse()

  if (dates.length < 2) {
    console.error('Not enough dates in database')
    sqlite.close()
    return
  }

  const lastDate = dates[dates.length - 1]
  console.log(`\nDate range: ${dates[0]} ~ ${lastDate}`)
  console.log(`Total available dates: ${dates.length}\n`)

  // 2. Map periods to start dates
  const periodDateMap = new Map<number, string>()
  for (const period of TARGET_PERIODS) {
    const targetIdx = Math.max(0, dates.length - 1 - period)
    periodDateMap.set(period, dates[targetIdx])
  }

  console.log('Period → Start date mapping:')
  for (const [period, startDate] of periodDateMap) {
    console.log(`  ${period}d: ${startDate} → ${lastDate}`)
  }

  // 3. Get all sectors with tickers
  const allSectors = await db
    .select({ id: schema.sectors.id, name: schema.sectors.name })
    .from(schema.sectors)

  const allSectorCompanies = await db
    .select({
      sectorId: schema.sectorCompanies.sectorId,
      ticker: schema.sectorCompanies.ticker,
    })
    .from(schema.sectorCompanies)

  const sectorTickerMap = new Map<string, string[]>()
  for (const sc of allSectorCompanies) {
    if (!sc.sectorId || !sc.ticker) continue
    const existing = sectorTickerMap.get(sc.sectorId)
    if (existing) {
      existing.push(sc.ticker)
    } else {
      sectorTickerMap.set(sc.sectorId, [sc.ticker])
    }
  }

  // 4. Pick first sector for detailed verification
  const testSector = allSectors[0]
  const testTickers = sectorTickerMap.get(testSector.id) || []

  console.log(`\n--- Detailed verification: ${testSector.name} (${testSector.id}) ---`)
  console.log(`Companies: ${testTickers.join(', ')}`)

  // 5. Manual calculation for test sector
  for (const period of TARGET_PERIODS) {
    const startDate = periodDateMap.get(period)!

    // Query start snapshots
    const startSnaps = await db
      .select({
        ticker: schema.dailySnapshots.ticker,
        marketCap: schema.dailySnapshots.marketCap,
      })
      .from(schema.dailySnapshots)
      .where(
        and(
          inArray(schema.dailySnapshots.ticker, testTickers),
          eq(schema.dailySnapshots.date, startDate)
        )
      )

    const endSnaps = await db
      .select({
        ticker: schema.dailySnapshots.ticker,
        marketCap: schema.dailySnapshots.marketCap,
      })
      .from(schema.dailySnapshots)
      .where(
        and(
          inArray(schema.dailySnapshots.ticker, testTickers),
          eq(schema.dailySnapshots.date, lastDate)
        )
      )

    let startCap = 0
    let endCap = 0

    for (const snap of startSnaps) {
      startCap += toUsd(snap.marketCap || 0, snap.ticker ?? '')
    }
    for (const snap of endSnaps) {
      endCap += toUsd(snap.marketCap || 0, snap.ticker ?? '')
    }

    const flowAmount = endCap - startCap
    const flowPercent = startCap > 0 ? (flowAmount / startCap) * 100 : 0

    console.log(
      `  ${String(period).padStart(2)}d: start=$${(startCap / 1e9).toFixed(2)}B → end=$${(endCap / 1e9).toFixed(2)}B | flow=${flowPercent >= 0 ? '+' : ''}${flowPercent.toFixed(2)}% ($${(flowAmount / 1e9).toFixed(2)}B)`
    )

    // Verify formula: flowPercent = (end - start) / start * 100
    const expectedPercent = startCap > 0 ? ((endCap - startCap) / startCap) * 100 : 0
    const formulaOk = Math.abs(flowPercent - expectedPercent) < 0.0001
    if (!formulaOk) {
      console.error(`    FORMULA MISMATCH: got ${flowPercent}, expected ${expectedPercent}`)
    }
  }

  // 6. Verify KRW conversion for a Korean ticker
  const krwTicker = testTickers.find((t) => isKoreanTicker(t))
  if (krwTicker) {
    const krwSnap = await db
      .select({
        ticker: schema.dailySnapshots.ticker,
        marketCap: schema.dailySnapshots.marketCap,
      })
      .from(schema.dailySnapshots)
      .where(
        and(
          eq(schema.dailySnapshots.ticker, krwTicker),
          eq(schema.dailySnapshots.date, lastDate)
        )
      )
      .limit(1)

    if (krwSnap.length > 0) {
      const rawCap = krwSnap[0].marketCap || 0
      const usdCap = toUsd(rawCap, krwTicker)
      console.log(`\n--- KRW conversion check: ${krwTicker} ---`)
      console.log(`  Raw: ${rawCap.toLocaleString()} KRW`)
      console.log(`  USD: $${usdCap.toLocaleString()} (rate: ${KRW_USD_RATE})`)
      console.log(`  Ratio: ${(rawCap / usdCap).toFixed(0)} (should be ~${KRW_USD_RATE})`)
    }
  } else {
    console.log('\nNo Korean tickers in test sector, skipping KRW check')
  }

  // 7. Summary table for all sectors (30d only)
  console.log('\n--- All sectors: 30-day flow % ---')
  console.log('  Sector'.padEnd(30) + '30d %'.padStart(10))
  console.log('  ' + '-'.repeat(38))

  const targetDates = Array.from(new Set([periodDateMap.get(30)!, lastDate]))
  const allSnapshots = await db
    .select({
      ticker: schema.dailySnapshots.ticker,
      date: schema.dailySnapshots.date,
      marketCap: schema.dailySnapshots.marketCap,
    })
    .from(schema.dailySnapshots)
    .where(inArray(schema.dailySnapshots.date, targetDates))

  const snapIndex = new Map<string, number>()
  for (const snap of allSnapshots) {
    if (!snap.ticker || !snap.date) continue
    snapIndex.set(`${snap.ticker}|${snap.date}`, toUsd(snap.marketCap || 0, snap.ticker))
  }

  const startDate30 = periodDateMap.get(30)!

  for (const sector of allSectors) {
    const tickers = sectorTickerMap.get(sector.id)
    if (!tickers || tickers.length === 0) continue

    let startCap = 0
    let endCap = 0
    for (const ticker of tickers) {
      startCap += snapIndex.get(`${ticker}|${startDate30}`) ?? 0
      endCap += snapIndex.get(`${ticker}|${lastDate}`) ?? 0
    }

    const pct = startCap > 0 ? ((endCap - startCap) / startCap) * 100 : 0
    console.log(`  ${sector.name.padEnd(28)}${(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}`.padStart(10))
  }

  console.log('\nVerification complete.')
  sqlite.close()
}

main().catch(console.error)
