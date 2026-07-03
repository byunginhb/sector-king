import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

// dailySnapshots 에 추가할 밸류에이션 지표 컬럼 (모두 무차원 비율 → toUsd 불요).
const NEW_COLUMNS: { name: string; type: string }[] = [
  { name: 'forward_pe', type: 'REAL' },
  { name: 'price_to_book', type: 'REAL' },
  { name: 'ev_to_ebitda', type: 'REAL' },
]

function migrate() {
  const sqlite = new Database(DB_PATH)

  const existing = sqlite
    .prepare("PRAGMA table_info('daily_snapshots')")
    .all() as { name: string }[]
  const existingNames = new Set(existing.map((c) => c.name))

  let added = 0
  for (const { name, type } of NEW_COLUMNS) {
    if (existingNames.has(name)) {
      console.log(`  ${name} 이미 존재 — skip`)
      continue
    }
    sqlite.exec(`ALTER TABLE daily_snapshots ADD COLUMN ${name} ${type}`)
    console.log(`  Added ${name} (${type})`)
    added++
  }

  // 커밋되는 DB 는 DELETE journal 모드여야 Vercel readonly FS 에서 /api/* 가 500 나지 않음.
  sqlite.pragma('journal_mode = DELETE')
  sqlite.close()
  console.log(`\nMigration completed! Added ${added}/${NEW_COLUMNS.length} columns`)
}

try {
  migrate()
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}
