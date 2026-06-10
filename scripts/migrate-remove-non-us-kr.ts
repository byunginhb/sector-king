/**
 * 마이그레이션 — 비(非) US/KR 종목 제거 (시장 범위 미국·한국 한정)
 *
 * 배경: 07_market_scope 라운드. 일본(.T)·홍콩(.HK)·대만(.TW)·유럽(.PA/.DE/.SW/.MC)·
 *       호주(.AX) 거래소 상장 22개 티커를 전 테이블에서 제거한다.
 *       제거 후 `companies.region='INTL'` 은 "순수 미국"을 의미하게 된다(옵션 A, 식별자 유지).
 *
 * SoT: 제거 22개 화이트리스트는 ticker-curation.md §1 / data-model.md §1.2 와 동기화.
 *      명시 화이트리스트를 쓰는 이유 — 리뷰·롤백이 단순하고 BRK.B 같은 점(.) 포함 US 티커 오탐을 피한다.
 *
 * 삭제 순서(자식 → 부모, FK 안전):
 *   score_history → daily_snapshots → company_scores → company_profiles
 *   → sector_companies → companies
 *
 * 멱등성: 모든 DELETE 가 `WHERE ticker IN (...)` 라 2회차 실행 시 changes=0.
 *         ALTER/CREATE 없음 → 완전 멱등.
 *
 * 안전:
 *   - `foreign_keys = ON` 으로 켜고 단일 트랜잭션 내 `PRAGMA foreign_key_check` 로 고아 행 사후 검증.
 *   - 검증 실패 시 throw → better-sqlite3 transaction 래퍼가 자동 ROLLBACK.
 *   - rank gap 은 건드리지 않음(이후 update_data.py 의 update_sector_rankings 가 1..N 재정렬로 흡수).
 *
 * 실행 전 반드시 DB 백업:
 *   cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 *
 * 실행: pnpm db:migrate:remove-non-us-kr
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

/**
 * 제거 대상 22개 티커 — SoT: ticker-curation.md §1 처리표.
 * 접미사 분포: .HK(2) .TW(1) .T(6) .PA(5) .DE(4) .SW(1) .MC(1) .AX(1) + (정정) 1810.HK,9618.HK
 */
const TICKERS_TO_REMOVE: readonly string[] = [
  '1810.HK', // Xiaomi
  '2454.TW', // MediaTek (※TSMC 아님)
  '4063.T', // Shin-Etsu Chemical
  '6752.T', // Panasonic
  '6954.T', // FANUC
  '8035.T', // Tokyo Electron
  '8306.T', // Mitsubishi UFJ
  '9618.HK', // JD.com
  '9697.T', // Capcom
  '9983.T', // Fast Retailing
  'AIR.PA', // Airbus
  'BMW.DE', // BMW
  'CFR.SW', // Richemont
  'ITX.MC', // Inditex
  'KER.PA', // Kering
  'LYC.AX', // Lynas Rare Earths
  'MBG.DE', // Mercedes-Benz
  'MC.PA', // LVMH
  'MUV2.DE', // Munich Re
  'OR.PA', // L'Oréal
  'P911.DE', // Porsche AG
  'RMS.PA', // Hermès
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

/** 비 US/KR 접미사 — 잔존 가드용(제거 후 0건이어야 정상) */
const NON_US_KR_SUFFIXES: readonly string[] = [
  '.T',
  '.PA',
  '.HK',
  '.TW',
  '.DE',
  '.SW',
  '.MC',
  '.AX',
] as const

interface CountRow {
  c: number
}

interface TickerRow {
  ticker: string
}

function countMatching(sqlite: Database.Database, table: string, placeholders: string): number {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ticker IN (${placeholders})`)
    .get(...TICKERS_TO_REMOVE) as CountRow
  return row.c
}

async function migrate(): Promise<void> {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  try {
    const placeholders = TICKERS_TO_REMOVE.map(() => '?').join(',')

    console.log('실행 전 백업 권고: cp data/hegemony.db data/hegemony.db.bak.$(date +%s)')
    console.log(`제거 대상 ${TICKERS_TO_REMOVE.length}개 티커:`, TICKERS_TO_REMOVE.join(', '))

    // 사전 카운트(드라이 정보용) — 실제 삭제는 트랜잭션 내부에서 수행
    console.log('\n[사전 점검] 테이블별 매칭 행수:')
    for (const table of DELETE_ORDER) {
      console.log(`  ${table}: ${countMatching(sqlite, table, placeholders)}행`)
    }

    let totalDeleted = 0
    const tx = sqlite.transaction(() => {
      for (const table of DELETE_ORDER) {
        const stmt = sqlite.prepare(`DELETE FROM ${table} WHERE ticker IN (${placeholders})`)
        const res = stmt.run(...TICKERS_TO_REMOVE)
        totalDeleted += res.changes
        console.log(`[del] ${table}: ${res.changes}행 삭제`)
      }

      // 무결성 사후 검사 — 고아 행이 남지 않았는지
      const fk = sqlite.prepare('PRAGMA foreign_key_check').all()
      if (fk.length > 0) {
        console.error('FK 무결성 위반:', fk)
        throw new Error('foreign_key_check 실패 — 트랜잭션 자동 ROLLBACK')
      }
    })
    tx()

    console.log(`\n총 ${totalDeleted}행 삭제 완료.`)

    // 잔존 비 US/KR 접미사 가드 — 화이트리스트 밖의 오염 잔재 점검
    const suffixClauses = NON_US_KR_SUFFIXES.map(() => 'ticker LIKE ?').join(' OR ')
    const likeArgs = NON_US_KR_SUFFIXES.map((s) => `%${s}`)
    const leftover = sqlite
      .prepare(`SELECT ticker FROM companies WHERE ${suffixClauses}`)
      .all(...likeArgs) as TickerRow[]

    if (leftover.length > 0) {
      console.warn(
        '[warn] 비 US/KR 접미사 잔존(화이트리스트 누락 가능):',
        leftover.map((r) => r.ticker)
      )
    } else {
      console.log('[ok] 비 US/KR 접미사 잔존 0건 — 시장 범위 정상.')
    }
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
