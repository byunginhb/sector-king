/**
 * 마이그레이션 — 비 US/KR 제거로 생긴 섹터 갭을 미국·한국 종목으로 보충
 *
 * 배경: 07_market_scope 라운드. migrate-remove-non-us-kr 로 22개를 제거하면
 *       일부 섹터의 패권주(rank1) 또는 대표성이 사라진다. 같은 라운드에서 확정 종목으로 보충한다.
 *
 * 확정 종목(SoT: ticker-curation.md §1~2 + integrated-plan.md APPROVED 결정 D1/D5):
 *   - ADR 대체(무손실, 정식 미국 상장만):
 *       MUFG → global_banks   (8306.T Mitsubishi UFJ 대체)
 *       JD   → ecommerce      (9618.HK JD.com 대체)
 *   - aircraft_mfg → "항공·방산" 확장:  LMT, RTX, GD, 047810.KS(KAI)  (BA 잔존)
 *   - luxury_fashion → 미국 럭셔리:      EL, RL                       (TPR/CPRI 잔존)
 *   - luxury_auto:                        추가 없음(TSLA/RACE 유지)
 *   - (선택/best-effort) materials: ALB / fast_fashion: ROST, BURL
 *
 * 이 스크립트가 하는 일:
 *   - `companies` INSERT OR IGNORE (region 은 접미사 기반 자동 주입 — getRegionFromTicker 동일 로직).
 *   - `sector_companies` INSERT OR IGNORE (rank 는 섹터별 현재 MAX(rank)+오프셋 임시값).
 *     실제 rank 는 이후 update_data.py 의 update_sector_rankings 가 점수순 1..N 으로 재정렬.
 *   - 스냅샷/점수 백필은 하지 않음(네트워크 필요) → 실행 후 add_ticker.py 또는 update_data.py 가 담당.
 *
 * 멱등성: companies/sector_companies 모두 INSERT OR IGNORE → 2회차 changes=0. 완전 멱등.
 *
 * 안전: 단일 트랜잭션 + foreign_keys=ON + foreign_key_check. rank CHECK(1..10) 위반 방지를 위해
 *       MAX(rank)+오프셋이 10 을 넘으면 경고하고 해당 매핑을 건너뛴다(이후 재정렬에 위임).
 *
 * 실행 전 백업 권고: cp data/hegemony.db data/hegemony.db.bak.$(date +%s)
 * 실행: pnpm db:migrate:add-us-kr-replacements
 */

import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

/** 한국 거래소 접미사 — lib/region.ts::getRegionFromTicker 와 동일 로직(미러) */
const KR_TICKER_SUFFIXES: readonly string[] = ['.KS', '.KQ'] as const

function getRegionFromTicker(ticker: string): 'KR' | 'INTL' {
  return KR_TICKER_SUFFIXES.some((suffix) => ticker.endsWith(suffix)) ? 'KR' : 'INTL'
}

interface ReplacementCompany {
  ticker: string
  name: string
  nameKo: string
}

interface ReplacementMapping {
  sectorId: string
  ticker: string
}

/**
 * 확정 종목 회사 정의. name 은 영문 표기(이후 update_data 가 yfinance shortName 으로 갱신 가능).
 */
const COMPANIES: readonly ReplacementCompany[] = [
  // ADR 대체
  { ticker: 'MUFG', name: 'Mitsubishi UFJ Financial Group', nameKo: '미쓰비시 UFJ' },
  { ticker: 'JD', name: 'JD.com Inc.', nameKo: '징둥닷컴' },
  // aircraft_mfg → 항공·방산
  { ticker: 'LMT', name: 'Lockheed Martin Corp.', nameKo: '록히드마틴' },
  { ticker: 'RTX', name: 'RTX Corporation', nameKo: '레이시온' },
  { ticker: 'GD', name: 'General Dynamics Corp.', nameKo: '제너럴다이내믹스' },
  { ticker: '047810.KS', name: 'Korea Aerospace Industries', nameKo: '한국항공우주' },
  // luxury_fashion → 미국 럭셔리
  { ticker: 'EL', name: 'Estée Lauder Companies', nameKo: '에스티로더' },
  { ticker: 'RL', name: 'Ralph Lauren Corp.', nameKo: '랄프로렌' },
  // (선택/best-effort)
  { ticker: 'ALB', name: 'Albemarle Corporation', nameKo: '알버말' },
  { ticker: 'ROST', name: 'Ross Stores Inc.', nameKo: '로스스토어스' },
  { ticker: 'BURL', name: 'Burlington Stores Inc.', nameKo: '벌링턴' },
] as const

/**
 * 섹터 매핑. rank 는 여기서 정하지 않고 섹터별 MAX(rank)+오프셋으로 임시 할당한다.
 * 배열 순서가 곧 섹터 내 오프셋 순서(첫 항목이 가장 낮은 임시 rank).
 */
const MAPPINGS: readonly ReplacementMapping[] = [
  { sectorId: 'global_banks', ticker: 'MUFG' },
  { sectorId: 'ecommerce', ticker: 'JD' },
  { sectorId: 'aircraft_mfg', ticker: 'LMT' },
  { sectorId: 'aircraft_mfg', ticker: 'RTX' },
  { sectorId: 'aircraft_mfg', ticker: 'GD' },
  { sectorId: 'aircraft_mfg', ticker: '047810.KS' },
  { sectorId: 'luxury_fashion', ticker: 'EL' },
  { sectorId: 'luxury_fashion', ticker: 'RL' },
  { sectorId: 'materials', ticker: 'ALB' },
  { sectorId: 'fast_fashion', ticker: 'ROST' },
  { sectorId: 'fast_fashion', ticker: 'BURL' },
] as const

interface MaxRankRow {
  m: number
}

interface SectorRow {
  id: string
}

async function migrate(): Promise<void> {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  try {
    console.log('실행 전 백업 권고: cp data/hegemony.db data/hegemony.db.bak.$(date +%s)')

    const insertCompany = sqlite.prepare(
      `INSERT OR IGNORE INTO companies (ticker, name, name_ko, region) VALUES (?, ?, ?, ?)`
    )
    const insertMapping = sqlite.prepare(
      `INSERT OR IGNORE INTO sector_companies (sector_id, ticker, rank) VALUES (?, ?, ?)`
    )
    const getMaxRank = sqlite.prepare(
      `SELECT COALESCE(MAX(rank), 0) AS m FROM sector_companies WHERE sector_id = ?`
    )
    const sectorExists = sqlite.prepare(`SELECT id FROM sectors WHERE id = ?`)

    let companyChanges = 0
    let mappingChanges = 0
    const skipped: string[] = []

    const tx = sqlite.transaction(() => {
      // 1) companies — region 자동 주입
      for (const c of COMPANIES) {
        const region = getRegionFromTicker(c.ticker)
        const res = insertCompany.run(c.ticker, c.name, c.nameKo, region)
        companyChanges += res.changes
        if (res.changes > 0) {
          console.log(`[company] ${c.ticker} (${c.nameKo}) [region=${region}]`)
        }
      }

      // 2) sector_companies — 섹터별 MAX(rank) 기준 임시 rank 부여
      //    같은 섹터에 여러 종목을 넣을 때 오프셋이 누적되도록 로컬 카운터 사용.
      const sectorOffset = new Map<string, number>()
      for (const m of MAPPINGS) {
        const sector = sectorExists.get(m.sectorId) as SectorRow | undefined
        if (!sector) {
          skipped.push(`${m.ticker}→${m.sectorId}(섹터 없음)`)
          continue
        }
        const base = (getMaxRank.get(m.sectorId) as MaxRankRow).m
        const offset = (sectorOffset.get(m.sectorId) ?? 0) + 1
        sectorOffset.set(m.sectorId, offset)
        const tempRank = base + offset

        if (tempRank > 10) {
          // rank CHECK(1..10) 위반 위험 — 임시값으로 넣지 않고 재정렬에 위임.
          // 단 INSERT OR IGNORE 가 매핑을 못 만들면 update_data 가 종목을 못 봄 → rank=10 으로 캡.
          const cappedRank = 10
          const res = insertMapping.run(m.sectorId, m.ticker, cappedRank)
          mappingChanges += res.changes
          console.warn(
            `[warn] ${m.ticker}→${m.sectorId}: 임시 rank ${tempRank}>10, rank=10 으로 캡(이후 재정렬).`
          )
          continue
        }

        const res = insertMapping.run(m.sectorId, m.ticker, tempRank)
        mappingChanges += res.changes
        if (res.changes > 0) {
          console.log(`[mapping] ${m.ticker} → ${m.sectorId} (임시 rank #${tempRank})`)
        }
      }

      const fk = sqlite.prepare('PRAGMA foreign_key_check').all()
      if (fk.length > 0) {
        console.error('FK 무결성 위반:', fk)
        throw new Error('foreign_key_check 실패 — 트랜잭션 자동 ROLLBACK')
      }
    })
    tx()

    console.log(
      `\ncompanies +${companyChanges}건, sector_companies +${mappingChanges}건 추가(멱등 — 기존은 IGNORE).`
    )
    if (skipped.length > 0) {
      console.warn('[skip] 매핑 건너뜀:', skipped.join(', '))
    }
    console.log(
      '\n다음 단계: 신규 티커 스냅샷/점수 백필이 필요합니다.\n' +
        '  옵션 A) 티커별 즉시 백필: .venv/bin/python scripts/add_ticker.py <TICKER> <SECTOR> (이미 매핑돼 있으면 "already in sector" — 그 경우 update_data 사용)\n' +
        '  옵션 B) 일괄: .venv/bin/python scripts/update_data.py  → 전 티커 스냅샷 + 점수 + rank 1..N 재정렬'
    )
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
