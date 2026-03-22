import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dbPath = path.join(process.cwd(), 'data', 'hegemony.db')

  const info = {
    cwd: process.cwd(),
    dbPath,
    dbExists: fs.existsSync(dbPath),
    dbSize: 0,
    journalMode: '',
    dateRange: null as { min: string; max: string; count: number } | null,
    walExists: fs.existsSync(dbPath + '-wal'),
    shmExists: fs.existsSync(dbPath + '-shm'),
  }

  if (info.dbExists) {
    info.dbSize = fs.statSync(dbPath).size
    try {
      const db = new Database(dbPath, { readonly: true })
      info.journalMode = db.pragma('journal_mode', { simple: true }) as string
      const row = db.prepare(
        'SELECT MIN(date) as min, MAX(date) as max, COUNT(DISTINCT date) as count FROM daily_snapshots'
      ).get() as { min: string; max: string; count: number }
      info.dateRange = row
      db.close()
    } catch (e: unknown) {
      return NextResponse.json({ error: String(e), info })
    }
  }

  return NextResponse.json(info)
}
