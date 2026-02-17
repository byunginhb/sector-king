import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import * as schema from '@/drizzle/schema'

const dbPath = path.join(process.cwd(), 'data', 'hegemony.db')

let sqlite: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!db) {
    sqlite = new Database(dbPath, { readonly: true })
    // Vercel은 읽기 전용 파일시스템이므로 WAL 모드 사용 안 함
    // 로컬 개발 환경에서만 WAL 모드 사용
    if (process.env.NODE_ENV === 'development') {
      try {
        sqlite.pragma('journal_mode = WAL')
      } catch {
        // WAL 모드 설정 실패 시 무시
      }
    }
    db = drizzle(sqlite, { schema })
  }
  return db
}

export function withWritableDb<T>(fn: (db: ReturnType<typeof drizzle<typeof schema>>) => T): T {
  const writableSqlite = new Database(dbPath)
  writableSqlite.pragma('journal_mode = WAL')
  try {
    return fn(drizzle(writableSqlite, { schema }))
  } finally {
    writableSqlite.close()
  }
}

export function closeDb() {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}

export { schema }
