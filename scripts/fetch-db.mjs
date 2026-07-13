#!/usr/bin/env node
/**
 * data/hegemony.db 를 db-snapshot(orphan) 브랜치에서 가져온다.
 *
 * DB 는 git 히스토리(main)에 쌓지 않고 db-snapshot 단일 커밋에만 둔다(저장소 팽창 분리).
 * 빌드(Vercel)·수집 워크플로우 시작 시 실행해 항상 최신 DB 를 확보한다.
 *
 * 종료 코드
 *  - 0: 유효한 DB 확보(fetch 성공, 또는 fetch 불가여도 로컬에 유효 DB 존재 → 개발 폴백)
 *  - 1: 유효한 DB 없음 → 빌드/수집을 중단시켜 빈·손상 DB 배포/푸시를 막는다(fail-loud)
 *
 * 유효성: SQLite 매직 헤더("SQLite format 3\0") + 최소 크기.
 */
import { execSync } from 'node:child_process'
import { existsSync, statSync, openSync, readSync, closeSync } from 'node:fs'
import path from 'node:path'

const DB = path.join(process.cwd(), 'data', 'hegemony.db')
const BRANCH = process.env.DB_SNAPSHOT_BRANCH || 'db-snapshot'
// 정상 DB 는 10MB+. 손상·빈 DB 가 소스오브트루스를 덮어쓰지 않도록 하한을 둔다.
const MIN_BYTES = 3_000_000

function isValidSqlite(file) {
  try {
    if (!existsSync(file) || statSync(file).size < MIN_BYTES) return false
    const fd = openSync(file, 'r')
    try {
      const buf = Buffer.alloc(16)
      readSync(fd, buf, 0, 16, 0)
      return buf.toString('latin1').startsWith('SQLite format 3\0')
    } finally {
      closeSync(fd)
    }
  } catch {
    return false
  }
}

let ok = false
try {
  execSync(`git fetch --depth=1 origin ${BRANCH}`, { stdio: ['ignore', 'ignore', 'pipe'] })
  execSync('git checkout FETCH_HEAD -- data/hegemony.db', { stdio: ['ignore', 'ignore', 'pipe'] })
  ok = isValidSqlite(DB)
  if (!ok) console.error('[fetch-db] fetched file failed validation')
} catch (e) {
  console.error(`[fetch-db] fetch from ${BRANCH} failed: ${String(e.message).split('\n')[0]}`)
}

if (ok) {
  console.log(`[fetch-db] OK — ${(statSync(DB).size / 1e6).toFixed(1)}MB from ${BRANCH}`)
  process.exit(0)
}

// 폴백: 네트워크/권한 문제로 fetch 불가여도 로컬에 유효 DB 가 있으면 그대로 사용(개발 환경).
if (isValidSqlite(DB)) {
  console.warn('[fetch-db] fetch unavailable — using existing local DB')
  process.exit(0)
}

console.error('[fetch-db] no valid DB and fetch failed — aborting to avoid shipping empty data')
process.exit(1)
