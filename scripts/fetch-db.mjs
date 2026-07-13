#!/usr/bin/env node
/**
 * data/hegemony.db 를 db-snapshot(orphan) 브랜치에서 가져온다.
 *
 * DB 는 git 히스토리(main)에 쌓지 않고 db-snapshot 단일 커밋에만 둔다(저장소 팽창 분리).
 * 빌드(Vercel)·수집 워크플로우 시작 시 실행해 항상 최신 DB 를 확보한다.
 *
 * 확보 순서
 *  1) HTTPS 다운로드(raw.githubusercontent) — Vercel 빌드는 `git fetch` 인증이 없어 이 방식이 필요.
 *     공개 저장소는 토큰 불필요. 비공개면 GH_TOKEN 헤더 사용.
 *  2) git fetch db-snapshot — 로컬/CI 등 git 인증이 있는 환경 폴백.
 *  3) 이미 있는 로컬 유효 DB — 개발 오프라인 폴백.
 *
 * 종료 코드: 0=유효 DB 확보 / 1=실패(빌드·수집 중단 → 빈·손상 DB 배포/푸시 방지)
 * 유효성: SQLite 매직 헤더("SQLite format 3\0") + 최소 크기.
 */
import { execSync } from 'node:child_process'
import { existsSync, statSync, openSync, readSync, closeSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const DB = path.join(process.cwd(), 'data', 'hegemony.db')
const BRANCH = process.env.DB_SNAPSHOT_BRANCH || 'db-snapshot'
// 정상 DB 는 10MB+. 손상·빈 DB 가 소스오브트루스를 덮어쓰지 않도록 하한을 둔다.
const MIN_BYTES = 3_000_000

// owner/repo 해석: 명시 → Actions → Vercel → 하드코딩.
const REPO =
  process.env.DB_SNAPSHOT_REPO ||
  process.env.GITHUB_REPOSITORY ||
  (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : 'byunginhb/sector-king')

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

function ensureDir() {
  mkdirSync(path.dirname(DB), { recursive: true })
}

// 1) HTTPS 다운로드 (Vercel 빌드 포함 어디서나 동작 — git 인증 불필요)
async function tryHttps() {
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data/hegemony.db`
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `token ${token}` } : {},
    })
    if (!res.ok) {
      console.error(`[fetch-db] HTTPS ${res.status} for ${REPO}@${BRANCH}`)
      return false
    }
    ensureDir()
    writeFileSync(DB, Buffer.from(await res.arrayBuffer()))
    return isValidSqlite(DB)
  } catch (e) {
    console.error(`[fetch-db] HTTPS failed: ${String(e.message).split('\n')[0]}`)
    return false
  }
}

// 2) git fetch (git 인증이 있는 로컬/CI 폴백)
function tryGit() {
  try {
    ensureDir()
    execSync(`git fetch --depth=1 origin ${BRANCH}`, { stdio: ['ignore', 'ignore', 'pipe'] })
    execSync('git checkout FETCH_HEAD -- data/hegemony.db', { stdio: ['ignore', 'ignore', 'pipe'] })
    return isValidSqlite(DB)
  } catch (e) {
    console.error(`[fetch-db] git fetch failed: ${String(e.message).split('\n')[0]}`)
    return false
  }
}

let ok = await tryHttps()
if (ok) {
  console.log(`[fetch-db] OK — ${(statSync(DB).size / 1e6).toFixed(1)}MB via HTTPS (${REPO}@${BRANCH})`)
  process.exit(0)
}

ok = tryGit()
if (ok) {
  console.log(`[fetch-db] OK — ${(statSync(DB).size / 1e6).toFixed(1)}MB via git (${BRANCH})`)
  process.exit(0)
}

// 3) 로컬 폴백(개발 오프라인)
if (isValidSqlite(DB)) {
  console.warn('[fetch-db] remote unavailable — using existing local DB')
  process.exit(0)
}

console.error('[fetch-db] no valid DB from any source — aborting to avoid shipping empty data')
process.exit(1)
