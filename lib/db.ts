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
    sqlite.pragma('journal_mode = WAL')
    db = drizzle(sqlite, { schema })
  }
  return db
}

export function getWritableDb() {
  const writableSqlite = new Database(dbPath)
  writableSqlite.pragma('journal_mode = WAL')
  return drizzle(writableSqlite, { schema })
}

export function closeDb() {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}

export { schema }
