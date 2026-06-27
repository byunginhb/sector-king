/**
 * 마이그레이션 — KR 시총 상위 200 보완 작업의 구조 변경 재현 (11_kr_top200)
 *
 * 배경:
 *   한국 시총 상위 200 누락 운영기업 99개를 add_ticker.py 로 적재하면서, 통신·해운·지주·
 *   가전·화학 등 기존에 없던 섹터/카테고리 18개를 신설하고 industry 에 연결했다. 종목 데이터
 *   자체는 _workspace/research/batch*.csv + run_batch.sh 로 재현하고(yfinance 필요), 이 스크립트는
 *   그 구조(카테고리/섹터/industry 연결 + rank cap 완화)만 재현한다.
 *
 * 멱등성:
 *   - rank CHECK 는 이미 ≤30 이면 skip, 아니면 테이블 재작성으로 완화.
 *   - 카테고리/섹터/industry_categories 는 INSERT OR IGNORE.
 *
 * 주의: seed.ts 는 초기 tech 부트스트랩만 담고 있어 현행 taxonomy 를 재현하지 못한다.
 *   taxonomy SoT 는 누적 마이그레이션 + 커밋된 data/hegemony.db 이다.
 *
 * 실행 전 백업: cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 * 실행: pnpm tsx scripts/migrate-add-kr-top200-sectors.ts
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

const RANK_CAP = 30

// [id, name, nameEn, order, regionScope]
const CATEGORIES: [string, string, string, number, string][] = [
  ['holding', '지주회사', 'Holding Companies', 46, 'ANY'],
  ['telecom', '통신', 'Telecom', 47, 'ANY'],
  ['consumer_electronics', '가전/전자', 'Consumer Electronics', 48, 'ANY'],
  ['chemicals', '화학', 'Chemicals', 49, 'ANY'],
]

// [id, categoryId, name, nameEn, order, description]
const SECTORS: [string, string, string, string, number, string][] = [
  ['holding', 'holding', '지주회사', 'Holding Company', 1, '지주·투자회사'],
  ['telecom', 'telecom', '통신서비스', 'Telecom Services', 1, '이동통신·유선통신'],
  ['home_appliance', 'consumer_electronics', '생활가전', 'Home Appliance', 1, '가전·렌탈'],
  ['display', 'consumer_electronics', '디스플레이', 'Display', 2, 'OLED·LCD 패널'],
  ['shipping', 'logistics_transport', '해운', 'Shipping', 3, '컨테이너·벌크 해운'],
  ['it_services', 'cloud', 'IT서비스/SI', 'IT Services', 9, '시스템통합·IT서비스'],
  ['nonferrous', 'mining_resources', '비철금속/제련', 'Nonferrous Metals', 3, '아연·구리 등 제련'],
  ['steel', 'mining_resources', '철강', 'Steel', 4, '철강·제철'],
  ['pcb', 'semiconductor', 'PCB/기판', 'PCB & Substrate', 7, '인쇄회로기판·반도체기판'],
  ['trading', 'industrial_conglomerate', '종합상사', 'Trading House', 5, '종합상사·트레이딩'],
  ['entertainment_agency', 'entertainment', '엔터·기획사', 'Entertainment Agency', 5, '음악·연예 기획사'],
  ['battery_materials', 'ev_energy', '2차전지 소재', 'Battery Materials', 10, '양극재·전구체·동박 등'],
  ['chemical', 'chemicals', '종합화학', 'Chemicals', 1, '석유화학·정밀화학·건자재'],
  ['casino', 'airline_travel', '카지노/레저', 'Casino & Leisure', 3, '카지노·리조트'],
]

// [industryId, categoryId]
const INDUSTRY_CATEGORIES: [string, string][] = [
  ['industrials', 'holding'],
  ['tech', 'telecom'],
  ['tech', 'consumer_electronics'],
  ['industrials', 'chemicals'],
]

function relaxRankCap(sqlite: Database.Database): void {
  const row = sqlite
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sector_companies'")
    .get() as { sql: string | null } | undefined
  const tableSql = row?.sql ?? ''
  const normalized = tableSql.replace(/\s+/g, '').toLowerCase()
  if (normalized.includes(`rank<=${RANK_CAP}`)) {
    console.log(`rank CHECK ≤${RANK_CAP} 이미 적용됨 — skip`)
    return
  }

  console.log(`rank CHECK 를 ≤${RANK_CAP} 으로 완화합니다 (테이블 재작성).`)
  sqlite.pragma('foreign_keys = OFF')
  const tx = sqlite.transaction(() => {
    sqlite.exec(`
      CREATE TABLE sector_companies_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector_id TEXT REFERENCES sectors(id),
        ticker TEXT REFERENCES companies(ticker),
        rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= ${RANK_CAP}),
        revenue_weight REAL NOT NULL DEFAULT 1.0,
        notes TEXT,
        UNIQUE (sector_id, ticker)
      )
    `)
    sqlite.exec(`
      INSERT INTO sector_companies_new (id, sector_id, ticker, rank, revenue_weight, notes)
      SELECT id, sector_id, ticker, rank, revenue_weight, notes FROM sector_companies
    `)
    sqlite.exec('DROP INDEX IF EXISTS idx_sector_companies_sector')
    sqlite.exec('DROP TABLE sector_companies')
    sqlite.exec('ALTER TABLE sector_companies_new RENAME TO sector_companies')
    sqlite.exec(
      'CREATE INDEX IF NOT EXISTS idx_sector_companies_sector ON sector_companies(sector_id)'
    )
    const fk = sqlite.prepare('PRAGMA foreign_key_check').all()
    if (fk.length > 0) throw new Error(`foreign_key_check 실패: ${JSON.stringify(fk)}`)
  })
  tx()
  sqlite.pragma('foreign_keys = ON')
  console.log(`rank CHECK ≤${RANK_CAP} 완화 완료.`)
}

function migrate(): void {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  try {
    relaxRankCap(sqlite)

    const insCat = sqlite.prepare(
      'INSERT OR IGNORE INTO categories (id, name, name_en, "order", region_scope) VALUES (?, ?, ?, ?, ?)'
    )
    const insSec = sqlite.prepare(
      'INSERT OR IGNORE INTO sectors (id, category_id, name, name_en, "order", description) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const insIc = sqlite.prepare(
      'INSERT OR IGNORE INTO industry_categories (industry_id, category_id) VALUES (?, ?)'
    )

    const tx = sqlite.transaction(() => {
      let c = 0
      for (const r of CATEGORIES) c += insCat.run(...r).changes
      let s = 0
      for (const r of SECTORS) s += insSec.run(...r).changes
      let i = 0
      for (const r of INDUSTRY_CATEGORIES) i += insIc.run(...r).changes
      console.log(`삽입: 카테고리 ${c}, 섹터 ${s}, industry 연결 ${i} (이미 있으면 0)`)
    })
    tx()

    // 정합성: 신규 카테고리/섹터의 FK 무결성 확인
    const orphan = sqlite
      .prepare(
        `SELECT s.id FROM sectors s LEFT JOIN categories c ON c.id = s.category_id WHERE c.id IS NULL`
      )
      .all()
    if (orphan.length > 0) throw new Error(`orphan 섹터 발견: ${JSON.stringify(orphan)}`)

    // prod(Vercel readonly FS)에서 better-sqlite3 readonly 오픈이 가능하려면 DB 가 WAL 이 아니어야 한다.
    // WAL DB 는 -wal/-shm 쓰기를 요구해 readonly FS 에서 열기 실패(500)한다. 작업 후 delete 모드로 복구.
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
    sqlite.pragma('journal_mode = DELETE')
    console.log('마이그레이션 완료.')
  } finally {
    sqlite.close()
  }
}

migrate()
