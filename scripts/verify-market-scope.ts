/**
 * 검증 스크립트 — 시장 범위(미국·한국 한정) 사후 점검 (읽기 전용, 멱등)
 *
 * 07_market_scope 라운드의 수락 기준 일부를 코드로 자동 검증한다.
 * DB 를 변경하지 않으므로 몇 번 실행해도 안전하다.
 *
 * 점검 항목:
 *   1) 비 US/KR 접미사(.T/.HK/.TW/.PA/.DE/.SW/.MC/.AX) 잔존 0건.
 *   2) 모든 섹터의 종목 수 ≥ 1 (단계 2 보충 후 붕괴 섹터 ≥ 2 권장 — 경고 수준).
 *   3) 섹터별 rank 연속성(1..N gap 없음). gap 은 경고(update_data 재정렬 전이면 정상).
 *   4) 대체 종목(MUFG/JD 등) 존재 + companies.region 일치(getRegionFromTicker SoT).
 *
 * 실행: pnpm db:verify:market-scope  (또는 pnpm tsx scripts/verify-market-scope.ts)
 *
 * 종료 코드: 치명(항목1 위반 또는 종목0 섹터)이면 1, 경고만이면 0.
 */

import Database from 'better-sqlite3'
import path from 'path'
import { getRegionFromTicker } from '../lib/region'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

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

/** 단계 2 에서 추가된 대표 대체 종목(존재 확인 대상) */
const EXPECTED_REPLACEMENTS: readonly string[] = ['MUFG', 'JD'] as const

interface TickerRow {
  ticker: string
}
interface SectorCountRow {
  sector_id: string
  cnt: number
}
interface RankRow {
  sector_id: string
  rank: number
}
interface RegionRow {
  ticker: string
  region: 'KR' | 'INTL'
}

function run(): void {
  const sqlite = new Database(DB_PATH, { readonly: true })

  let fatal = 0
  let warnings = 0

  try {
    // ── 점검 1: 비 US/KR 접미사 잔존 ──────────────────────────────────────
    const suffixClauses = NON_US_KR_SUFFIXES.map(() => 'ticker LIKE ?').join(' OR ')
    const likeArgs = NON_US_KR_SUFFIXES.map((s) => `%${s}`)
    const leftover = sqlite
      .prepare(`SELECT DISTINCT ticker FROM companies WHERE ${suffixClauses}`)
      .all(...likeArgs) as TickerRow[]

    if (leftover.length > 0) {
      fatal++
      console.error(`[FAIL] 비 US/KR 접미사 잔존 ${leftover.length}건:`, leftover.map((r) => r.ticker))
    } else {
      console.log('[PASS] 비 US/KR 접미사 잔존 0건.')
    }

    // sector_companies 에도 잔존 없는지(고아/매핑) 추가 점검
    const leftoverMapping = sqlite
      .prepare(`SELECT DISTINCT ticker FROM sector_companies WHERE ${suffixClauses}`)
      .all(...likeArgs) as TickerRow[]
    if (leftoverMapping.length > 0) {
      fatal++
      console.error(
        `[FAIL] sector_companies 비 US/KR 매핑 잔존 ${leftoverMapping.length}건:`,
        leftoverMapping.map((r) => r.ticker)
      )
    } else {
      console.log('[PASS] sector_companies 비 US/KR 매핑 잔존 0건.')
    }

    // ── 점검 2: 섹터별 종목 수 ────────────────────────────────────────────
    const counts = sqlite
      .prepare(
        `SELECT sector_id, COUNT(*) AS cnt FROM sector_companies GROUP BY sector_id ORDER BY cnt ASC`
      )
      .all() as SectorCountRow[]

    const zeroSectors = counts.filter((c) => c.cnt < 1)
    const oneSectors = counts.filter((c) => c.cnt === 1)

    // 매핑이 0인 섹터(=GROUP BY 에 안 나옴)도 잡기
    const allSectors = sqlite.prepare(`SELECT id FROM sectors`).all() as { id: string }[]
    const mappedIds = new Set(counts.map((c) => c.sector_id))
    const emptySectors = allSectors.filter((s) => !mappedIds.has(s.id))

    if (zeroSectors.length > 0 || emptySectors.length > 0) {
      fatal++
      console.error(
        '[FAIL] 종목 0개 섹터:',
        [...zeroSectors.map((c) => c.sector_id), ...emptySectors.map((s) => s.id)]
      )
    } else {
      console.log(`[PASS] 모든 섹터 종목 수 ≥ 1 (총 ${counts.length}개 섹터).`)
    }

    if (oneSectors.length > 0) {
      warnings++
      console.warn(
        `[WARN] 단일 종목 섹터 ${oneSectors.length}개(비교/머니플로우 빈약):`,
        oneSectors.map((c) => c.sector_id).join(', ')
      )
    }

    // ── 점검 3: rank 연속성 ───────────────────────────────────────────────
    const ranks = sqlite
      .prepare(`SELECT sector_id, rank FROM sector_companies ORDER BY sector_id, rank`)
      .all() as RankRow[]

    const bySector = new Map<string, number[]>()
    for (const r of ranks) {
      const arr = bySector.get(r.sector_id) ?? []
      arr.push(r.rank)
      bySector.set(r.sector_id, arr)
    }

    const gappy: string[] = []
    for (const [sectorId, rankArr] of bySector) {
      const sorted = [...rankArr].sort((a, b) => a - b)
      const expected = sorted.map((_, i) => i + 1)
      const isContiguous = sorted.every((v, i) => v === expected[i])
      if (!isContiguous) gappy.push(sectorId)
    }

    if (gappy.length > 0) {
      warnings++
      console.warn(
        `[WARN] rank 연속성 gap ${gappy.length}개 섹터(update_data 재정렬 전이면 정상):`,
        gappy.join(', ')
      )
    } else {
      console.log('[PASS] 모든 섹터 rank 1..N 연속.')
    }

    // ── 점검 4: 대체 종목 존재 + region 일치 ──────────────────────────────
    const missing: string[] = []
    for (const t of EXPECTED_REPLACEMENTS) {
      const row = sqlite.prepare(`SELECT ticker FROM companies WHERE ticker = ?`).get(t)
      if (!row) missing.push(t)
    }
    if (missing.length > 0) {
      warnings++
      console.warn(`[WARN] 대체 종목 미존재(보충 마이그레이션 미실행?):`, missing.join(', '))
    } else {
      console.log(`[PASS] 대체 종목 존재(${EXPECTED_REPLACEMENTS.join(', ')}).`)
    }

    // region 컬럼 ↔ getRegionFromTicker 일관성
    const regionRows = sqlite.prepare(`SELECT ticker, region FROM companies`).all() as RegionRow[]
    const regionMismatch = regionRows.filter((r) => getRegionFromTicker(r.ticker) !== r.region)
    if (regionMismatch.length > 0) {
      warnings++
      console.warn(
        `[WARN] region 컬럼 ≠ getRegionFromTicker ${regionMismatch.length}건:`,
        regionMismatch.slice(0, 10).map((r) => `${r.ticker}(${r.region})`)
      )
    } else {
      console.log('[PASS] companies.region 이 getRegionFromTicker 와 일치.')
    }

    console.log(`\n검증 종료 — 치명 ${fatal}건, 경고 ${warnings}건.`)
  } catch (error) {
    console.error('검증 실패:', error)
    fatal++
  } finally {
    sqlite.close()
  }

  process.exit(fatal > 0 ? 1 : 0)
}

run()
