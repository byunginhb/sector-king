/**
 * 마이그레이션 — sector_companies.rank CHECK 제약 완화 (≤5 → ≤10)
 *
 * SQLite는 CHECK 제약을 직접 변경할 수 없다.
 * 테이블 재작성 패턴(create new + copy + drop + rename)으로 처리한다.
 *
 * 멱등성:
 *   - sqlite_master에서 sector_companies CREATE 문을 조회하여
 *     이미 'rank <= 10'(또는 'rank<=10')을 포함하면 skip 한다.
 *   - 처음부터 CHECK 제약이 없는 환경(드물지만 가능)도 skip.
 *
 * 안전 권고: 실행 전 반드시 DB 백업.
 *   cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 *
 * 실행: pnpm db:migrate:relax-rank
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

interface MasterRow {
  sql: string | null
}

/**
 * sqlite_master에서 sector_companies 테이블의 현재 정의(SQL)를 가져온다.
 */
function getTableSql(sqlite: Database.Database, table: string): string | null {
  const row = sqlite
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as MasterRow | undefined
  return row?.sql ?? null
}

/**
 * CHECK 제약이 이미 ≤10으로 완화되었는지 검사.
 * 공백 변형을 허용해 'rank <= 10', 'rank<=10' 모두 매치.
 */
function isAlreadyRelaxed(tableSql: string): boolean {
  const normalized = tableSql.replace(/\s+/g, '').toLowerCase()
  return normalized.includes('rank<=10')
}

/**
 * CHECK 제약이 아예 없는 케이스(테이블 재생성 불필요)인지 판정.
 */
function hasRankCheck(tableSql: string): boolean {
  const normalized = tableSql.replace(/\s+/g, '').toLowerCase()
  return /rank<=\d+/.test(normalized) || /check\(rank/.test(normalized)
}

async function migrate(): Promise<void> {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  try {
    const tableSql = getTableSql(sqlite, 'sector_companies')
    if (!tableSql) {
      console.error('sector_companies 테이블이 존재하지 않습니다.')
      process.exitCode = 1
      return
    }

    if (isAlreadyRelaxed(tableSql)) {
      console.log('rank CHECK ≤10 이미 적용됨 — skip')
      return
    }

    if (!hasRankCheck(tableSql)) {
      console.log('sector_companies에 rank CHECK 제약이 없습니다 — skip')
      return
    }

    console.log('rank CHECK 제약을 ≤10으로 완화합니다 (테이블 재작성).')

    // 외래 키를 일시적으로 비활성화 (better-sqlite3는 기본적으로 OFF지만 명시).
    sqlite.pragma('foreign_keys = OFF')

    const tx = sqlite.transaction(() => {
      // 1) 새 테이블 생성 — 기존 정의(인덱스 제외)와 동일하되 CHECK ≤10
      sqlite.exec(`
        CREATE TABLE sector_companies_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sector_id TEXT REFERENCES sectors(id),
          ticker TEXT REFERENCES companies(ticker),
          rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
          revenue_weight REAL NOT NULL DEFAULT 1.0,
          notes TEXT,
          UNIQUE (sector_id, ticker)
        )
      `)

      // 2) 데이터 복사 — 컬럼 명시 (스키마 변형에 강함)
      sqlite.exec(`
        INSERT INTO sector_companies_new (id, sector_id, ticker, rank, revenue_weight, notes)
        SELECT id, sector_id, ticker, rank, revenue_weight, notes FROM sector_companies
      `)

      // 3) 기존 인덱스 제거 (테이블 DROP 시 함께 사라지지만 명시 안전)
      sqlite.exec(`DROP INDEX IF EXISTS idx_sector_companies_sector`)

      // 4) 기존 테이블 제거 후 rename
      sqlite.exec(`DROP TABLE sector_companies`)
      sqlite.exec(`ALTER TABLE sector_companies_new RENAME TO sector_companies`)

      // 5) 인덱스 재생성
      sqlite.exec(
        `CREATE INDEX IF NOT EXISTS idx_sector_companies_sector ON sector_companies(sector_id)`
      )

      // 6) 외래 키 무결성 사후 검사 — 트랜잭션 내부에서 수행
      //    throw 시 better-sqlite3 의 transaction 래퍼가 자동 ROLLBACK 한다.
      const fkCheck = sqlite.prepare('PRAGMA foreign_key_check').all()
      if (fkCheck.length > 0) {
        console.error('외래 키 무결성 위반 발견:', fkCheck)
        throw new Error('foreign_key_check 실패 — 트랜잭션 자동 롤백')
      }
    })

    tx()

    sqlite.pragma('foreign_keys = ON')

    console.log('rank CHECK 제약 완화 완료 (≤10).')
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
