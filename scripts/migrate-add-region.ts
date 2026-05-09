/**
 * 마이그레이션 — companies.region, categories.region_scope 컬럼 추가 + 백필
 *
 * 멱등성: 두 번 실행해도 두 번째 실행은 변경 0건이어야 한다.
 *
 * 단계:
 *   1) companies.region 컬럼 추가 (PRAGMA table_info 사전 체크)
 *   2) idx_companies_region 인덱스 생성 (IF NOT EXISTS)
 *   3) 모든 companies row를 접미사 기반으로 백필 (lib/region.ts 동일 로직)
 *   4) categories.region_scope 컬럼 추가 (PRAGMA table_info 사전 체크)
 *   5) korea_bio, korea_banks 카테고리에 region_scope='KR' 백필
 *
 * 실행: pnpm db:migrate:region
 *
 * 안전 권고: 실행 전 반드시 DB 백업.
 *   cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 */

import Database from 'better-sqlite3'
import path from 'path'
import { getRegionFromTicker } from '../lib/region'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

/** region_scope='KR'로 마킹할 카테고리 — 통합 기획서 §4.3 */
const KR_SCOPE_CATEGORIES = ['korea_bio', 'korea_banks'] as const

interface ColumnInfo {
  name: string
}

function hasColumn(sqlite: Database.Database, table: string, column: string): boolean {
  const cols = sqlite.prepare(`PRAGMA table_info('${table}')`).all() as ColumnInfo[]
  return cols.some((c) => c.name === column)
}

async function migrate(): Promise<void> {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  try {
    // ── Step 1: companies.region 컬럼 ──────────────────────────────────────
    if (!hasColumn(sqlite, 'companies', 'region')) {
      sqlite.exec(
        `ALTER TABLE companies ADD COLUMN region TEXT NOT NULL DEFAULT 'INTL'`
      )
      console.log('[1/5] companies.region 컬럼 추가됨')
    } else {
      console.log('[1/5] companies.region 이미 존재 — skip')
    }

    // ── Step 2: 인덱스 ─────────────────────────────────────────────────────
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region)`)
    console.log('[2/5] idx_companies_region 인덱스 보장')

    // ── Step 3: companies.region 백필 (결정론적, 트랜잭션) ─────────────────
    const tickers = sqlite
      .prepare('SELECT ticker, region FROM companies')
      .all() as { ticker: string; region: string }[]

    const updateRegion = sqlite.prepare(
      'UPDATE companies SET region = ? WHERE ticker = ? AND region IS NOT ?'
    )

    let companyChanges = 0
    const tx1 = sqlite.transaction(() => {
      for (const row of tickers) {
        const expected = getRegionFromTicker(row.ticker)
        const result = updateRegion.run(expected, row.ticker, expected)
        companyChanges += result.changes
      }
    })
    tx1()
    console.log(
      `[3/5] companies.region 백필 — 변경 ${companyChanges}건 / 전체 ${tickers.length}건`
    )

    // ── Step 4: categories.region_scope 컬럼 ──────────────────────────────
    if (!hasColumn(sqlite, 'categories', 'region_scope')) {
      sqlite.exec(
        `ALTER TABLE categories ADD COLUMN region_scope TEXT NOT NULL DEFAULT 'ANY'`
      )
      console.log('[4/5] categories.region_scope 컬럼 추가됨')
    } else {
      console.log('[4/5] categories.region_scope 이미 존재 — skip')
    }

    // ── Step 5: KR-scope 카테고리 백필 ────────────────────────────────────
    const updateScope = sqlite.prepare(
      'UPDATE categories SET region_scope = ? WHERE id = ? AND region_scope IS NOT ?'
    )

    let categoryChanges = 0
    const tx2 = sqlite.transaction(() => {
      for (const id of KR_SCOPE_CATEGORIES) {
        const result = updateScope.run('KR', id, 'KR')
        categoryChanges += result.changes
      }
    })
    tx2()
    console.log(
      `[5/5] categories.region_scope 백필 — 변경 ${categoryChanges}건 (대상 ${KR_SCOPE_CATEGORIES.length}개)`
    )

    console.log('\n마이그레이션 완료 — region 컬럼 + 백필')
  } catch (error) {
    console.error('마이그레이션 실패:', error)
    throw error
  } finally {
    sqlite.close()
  }
}

migrate().catch((error) => {
  console.error(error)
  process.exit(1)
})
