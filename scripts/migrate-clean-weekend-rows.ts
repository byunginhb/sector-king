/**
 * 마이그레이션 — 주말(토/일) 스냅샷·스코어 행 삭제 (carry-forward 노이즈 제거)
 *
 * 배경: 09_accuracy_audit B4-b. update_data 가 주말에도 yfinance .info 라이브값을
 *       저장해 직전 거래일을 복제한 행이 다수 생성됐다(가격 무변동·거래량 미세변동).
 *       money-flow/모멘텀/52주 윈도우 계산에 비거래일이 섞여 정합성을 해친다.
 *
 * 대상: daily_snapshots, score_history 에서 strftime('%w', date) IN ('0','6') 인 행.
 *       ('0'=일요일, '6'=토요일 — SQLite strftime %w 규칙)
 *
 * 멱등성: WHERE 조건 기반 DELETE 라 2회차 실행 시 changes=0. ALTER/CREATE 없음 → 완전 멱등.
 *
 * 안전: foreign_keys=ON, 단일 트랜잭션, 삭제 후 PRAGMA foreign_key_check.
 *       (자식 테이블만 삭제하므로 고아는 생기지 않지만 방어적으로 검사.)
 *
 * 실행 전 백업: cp data/hegemony.db data/hegemony.db.bak.audit.$(date +%s)
 * 실행: pnpm db:migrate:clean-weekend-rows
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

const WEEKEND_PREDICATE = "strftime('%w', date) IN ('0','6')"
const TARGET_TABLES: readonly string[] = ['daily_snapshots', 'score_history'] as const

interface CountRow {
  c: number
}

function countWeekend(sqlite: Database.Database, table: string): number {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${WEEKEND_PREDICATE}`)
    .get() as CountRow
  return row.c
}

function migrate(): void {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  try {
    console.log('실행 전 백업 권고: cp data/hegemony.db data/hegemony.db.bak.audit.$(date +%s)')

    console.log('\n[사전 점검] 테이블별 주말 행수:')
    for (const table of TARGET_TABLES) {
      console.log(`  ${table}: ${countWeekend(sqlite, table)}행`)
    }

    let totalDeleted = 0
    const tx = sqlite.transaction(() => {
      for (const table of TARGET_TABLES) {
        const res = sqlite.prepare(`DELETE FROM ${table} WHERE ${WEEKEND_PREDICATE}`).run()
        totalDeleted += res.changes
        console.log(`[del] ${table}: ${res.changes}행 삭제`)
      }

      const fk = sqlite.prepare('PRAGMA foreign_key_check').all()
      if (fk.length > 0) {
        console.error('FK 무결성 위반:', fk)
        throw new Error('foreign_key_check 실패 — 트랜잭션 자동 ROLLBACK')
      }
    })
    tx()

    console.log(`\n총 ${totalDeleted}행 삭제 완료.`)

    console.log('\n[사후 점검] 남은 주말 행수(0이어야 정상):')
    for (const table of TARGET_TABLES) {
      const remaining = countWeekend(sqlite, table)
      const tag = remaining === 0 ? '[ok]' : '[warn]'
      console.log(`  ${tag} ${table}: ${remaining}행`)
    }
  } catch (error) {
    console.error('마이그레이션 실패:', error)
    throw error
  } finally {
    sqlite.close()
  }
}

migrate()
