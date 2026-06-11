/**
 * 마이그레이션 — 데이터 없는/좀비/상폐 티커 제거 (09_accuracy_audit A5)
 *
 * 배경: A1-c/B5 감사에서 company_scores·daily_snapshots 가 비거나 stale 인 종목 발견.
 *       yfinance 프로브(.info marketCap / history) 결과(2026-06-11)로 다음을 확정 삭제한다.
 *
 * 삭제 대상 (프로브 근거):
 *   - CATL, ABB           : 비 US/KR 범위 위반 좀비(중국·스위스). info/hist 모두 없음. 무조건 삭제.
 *   - JWN, CYBR, BLUE,    : info 없음 + history 5d/1mo 빈값(3회 재시도) → 상폐/인수.
 *     PLL, EXAS, CFLT       대조군 AAPL/NVDA/MSFT 는 정상 → yfinance 일시 장애 아님(확정).
 *   - SQ, PARA            : 개명. SQ→XYZ(Block), PARA→PSKY(Paramount Skydance) 로 add_ticker.py 백필 대체.
 *                            여기서는 옛 식별자만 제거하고, 대체는 별도 add_ticker 단계에서 수행.
 *   - 263750.KS/039030.KS/  : KR 종목이나 Yahoo 에서 symbol 단위로 marketCap 미제공(.info None).
 *     041510.KS/950140.KS/    KR 대조군(005930.KS/000660.KS)은 mc 정상 → off-session 아닌 symbol 결함.
 *     326030.KQ               history 도 거래량이 비정상(81/1/11 등)이라 스코어링 불가 → 삭제.
 *                            (상폐 아님이나 Yahoo 데이터 미servable → 빈 카드 품질 결함 제거)
 *
 * 멱등성: WHERE ticker IN (...) DELETE → 2회차 changes=0. ALTER/CREATE 없음 → 완전 멱등.
 * 안전: foreign_keys=ON, 단일 트랜잭션, 삭제 후 PRAGMA foreign_key_check. 실패 시 자동 ROLLBACK.
 *
 * 실행 전 백업: cp data/hegemony.db data/hegemony.db.bak.audit.$(date +%s)
 * 실행: pnpm db:migrate:clean-broken-tickers
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

/**
 * 삭제 확정 티커. SQ/PARA 는 개명 대체(이후 add_ticker.py 로 XYZ/PSKY 추가)를 위해
 * 옛 식별자만 제거한다.
 */
const TICKERS_TO_REMOVE: readonly string[] = [
  'CATL', // 좀비(중국 CATL) — 범위 위반
  'ABB', // 좀비(스위스 ABB) — 범위 위반
  'JWN', // Nordstrom — 데이터 없음(상폐/인수)
  'CYBR', // CyberArk — 데이터 없음
  'BLUE', // bluebird bio — 데이터 없음
  'PLL', // Piedmont Lithium — 데이터 없음
  'EXAS', // Exact Sciences — 데이터 없음
  'CFLT', // Confluent — 데이터 없음
  'SQ', // → XYZ (Block 개명). 대체는 add_ticker.py
  'PARA', // → PSKY (Paramount Skydance 개명). 대체는 add_ticker.py
  '263750.KS', // Pearl Abyss — Yahoo .info marketCap 미제공(symbol 결함)
  '039030.KS', // Eo Technics — 동일
  '041510.KS', // SM Entertainment — 동일
  '950140.KS', // GC Biopharma — 동일
  '326030.KQ', // SK Biopharm — 4개월 stale + .info 미제공
] as const

/** 자식 → 부모 순 (FK 안전). companies 가 루트 부모이므로 마지막. */
const DELETE_ORDER: readonly string[] = [
  'score_history',
  'daily_snapshots',
  'company_scores',
  'company_profiles',
  'sector_companies',
  'companies',
] as const

interface CountRow {
  c: number
}

function countMatching(sqlite: Database.Database, table: string, placeholders: string): number {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ticker IN (${placeholders})`)
    .get(...TICKERS_TO_REMOVE) as CountRow
  return row.c
}

function migrate(): void {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  try {
    const placeholders = TICKERS_TO_REMOVE.map(() => '?').join(',')

    console.log('실행 전 백업 권고: cp data/hegemony.db data/hegemony.db.bak.audit.$(date +%s)')
    console.log(`제거 대상 ${TICKERS_TO_REMOVE.length}개:`, TICKERS_TO_REMOVE.join(', '))

    console.log('\n[사전 점검] 테이블별 매칭 행수:')
    for (const table of DELETE_ORDER) {
      console.log(`  ${table}: ${countMatching(sqlite, table, placeholders)}행`)
    }

    let totalDeleted = 0
    const tx = sqlite.transaction(() => {
      for (const table of DELETE_ORDER) {
        const res = sqlite
          .prepare(`DELETE FROM ${table} WHERE ticker IN (${placeholders})`)
          .run(...TICKERS_TO_REMOVE)
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
    console.log('대체 종목(XYZ←SQ, PSKY←PARA) 및 KR5 복구는 add_ticker.py 로 별도 수행.')
  } catch (error) {
    console.error('마이그레이션 실패:', error)
    throw error
  } finally {
    sqlite.close()
  }
}

migrate()
