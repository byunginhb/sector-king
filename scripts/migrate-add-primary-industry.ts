/**
 * industry_categories 에 is_primary 추가 — 카테고리의 "대표 산업" 지정.
 *
 * 배경(버그):
 *   카테고리는 산업과 M:N 이다. 이 연결은 원래 "이 산업을 볼 때 이 카테고리도
 *   보여준다"는 내비게이션 용도라 다대다가 맞다. 그런데 시총 지도는 면적을
 *   그리려고 카테고리를 산업 하나에 배타적으로 귀속시켜야 하는데, 기존 API 는
 *   대표 산업을 "order 가 가장 작은 산업"으로 골랐다. 테크가 order=1 이라
 *   다중 연결 카테고리 6개가 전부 테크로 귀속됐다.
 *
 *   결과: 제약·바이오테크·의료기기가 테크로 집계되어 헬스케어 산업에는 항암제 같은
 *   테마 섹터만 남았다. 전체 시총의 23.2%($18.4T)가 테크로 잘못 쏠렸다.
 *
 * 해결:
 *   내비게이션용 M:N 은 그대로 두고, 귀속 전용 플래그(is_primary)를 따로 둔다.
 *   카테고리당 정확히 하나만 1 이며 부분 유니크 인덱스로 강제한다.
 *
 * 대표 산업 판정은 GICS 를 따른다(실제 지수 분류와 비교 가능하도록):
 *   - 제약/바이오/의료기기 → Health Care
 *   - 결제/디지털뱅킹 → Financials (GICS 2023 개편에서 결제가 금융으로 이동)
 *   - 전기차 → 모빌리티
 *   - 우주(SpaceX 등) → 방산/항공우주
 *   - 검색·광고·게임·스트리밍 → Communication Services 이므로 테크 유지
 *
 * 멱등: 여러 번 실행해도 같은 결과.
 *   실행: pnpm tsx scripts/migrate-add-primary-industry.ts
 */

import Database from 'better-sqlite3'
import { join } from 'node:path'

const DB_PATH = join(process.cwd(), 'data', 'hegemony.db')

/**
 * 다중 산업 카테고리의 대표 산업(GICS 기준).
 * 단일 연결 카테고리는 선택지가 하나뿐이라 자동 지정되므로 여기 없다.
 */
const PRIMARY: Record<string, string> = {
  healthcare: 'healthcare_industry', // 제약·바이오테크·의료기기
  fintech: 'finance', // 결제·디지털뱅킹
  ev_energy: 'mobility', // 전기차
  future_tech: 'tech', // 자율주행·양자컴퓨터 (우주는 아래에서 분리)
  internet: 'tech', // 검색·광고·커머스 (Comm Services)
  entertainment: 'tech', // 게임·스트리밍 (Comm Services)
}

/**
 * 섹터 재배치 — 카테고리 단위 귀속으로는 해결되지 않는 예외.
 *
 * 미래기술 카테고리는 자율주행·양자컴퓨터·우주를 함께 담고 있었다. 이 카테고리를
 * 통째로 방산에 귀속시키면 자율주행(엔비디아·테슬라·구글)과 양자컴퓨터(구글·IBM)
 * 까지 방산이 되어 방산 비중이 9% 로 부풀었다(실제 지수 기준 약 2%).
 * 셋 중 우주(스페이스X·보잉·록히드마틴)만 항공우주 소속이므로 그 섹터만 옮기고,
 * 나머지는 카테고리에 남겨 테크로 귀속시킨다.
 */
const SECTOR_RECATEGORIZE: Record<string, string> = {
  space: 'aerospace_systems', // 우주 → 항공우주(방산/항공우주 산업)
}

function main(): void {
  const db = new Database(DB_PATH)
  try {
    db.pragma('foreign_keys = ON')

    const hasColumn = db
      .prepare(`SELECT COUNT(*) n FROM pragma_table_info('industry_categories') WHERE name='is_primary'`)
      .get() as { n: number }

    if (hasColumn.n === 0) {
      db.exec(
        `ALTER TABLE industry_categories ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0`
      )
      console.log('· is_primary 컬럼 추가')
    } else {
      console.log('· is_primary 컬럼 이미 존재 — 건너뜀')
    }

    const apply = db.transaction(() => {
      // 섹터 재배치 먼저 — 아래 대표 산업 지정이 이 결과를 전제로 한다.
      const move = db.prepare(
        `UPDATE sectors SET category_id = ? WHERE id = ? AND category_id <> ?`
      )
      for (const [sectorId, categoryId] of Object.entries(SECTOR_RECATEGORIZE)) {
        const exists = db
          .prepare(`SELECT COUNT(*) n FROM categories WHERE id = ?`)
          .get(categoryId) as { n: number }
        if (exists.n !== 1) {
          throw new Error(`재배치 대상 카테고리 없음: ${categoryId}`)
        }
        const r = move.run(categoryId, sectorId, categoryId)
        console.log(
          r.changes === 1
            ? `· 섹터 재배치: ${sectorId} → ${categoryId}`
            : `· 섹터 재배치: ${sectorId} 이미 ${categoryId} — 건너뜀`
        )
      }

      // 재실행 시 깨끗한 상태에서 다시 지정 (멱등)
      db.exec(`UPDATE industry_categories SET is_primary = 0`)

      // 1) 단일 연결 카테고리 — 선택의 여지가 없으므로 자동 지정
      const single = db.prepare(`
        UPDATE industry_categories SET is_primary = 1
        WHERE category_id IN (
          SELECT category_id FROM industry_categories GROUP BY category_id HAVING COUNT(*) = 1
        )
      `).run()
      console.log(`· 단일 연결 카테고리 자동 지정: ${single.changes}건`)

      // 2) 다중 연결 카테고리 — GICS 기준 명시 지정
      const stmt = db.prepare(
        `UPDATE industry_categories SET is_primary = 1 WHERE category_id = ? AND industry_id = ?`
      )
      for (const [categoryId, industryId] of Object.entries(PRIMARY)) {
        const r = stmt.run(categoryId, industryId)
        if (r.changes !== 1) {
          throw new Error(
            `대표 산업 지정 실패: ${categoryId} → ${industryId} (매칭 ${r.changes}건). ` +
              `industry_categories 에 해당 연결이 없다.`
          )
        }
        console.log(`· ${categoryId} → ${industryId}`)
      }
    })
    apply()

    // 카테고리당 대표 산업은 정확히 하나여야 한다 — DB 레벨에서 강제
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_ic_primary
       ON industry_categories(category_id) WHERE is_primary = 1`
    )

    // 검증: 대표 산업이 없는 카테고리가 남으면 지도에서 통째로 사라진다
    const orphans = db
      .prepare(
        `SELECT c.id FROM categories c
         WHERE NOT EXISTS (
           SELECT 1 FROM industry_categories ic
           WHERE ic.category_id = c.id AND ic.is_primary = 1
         )
         AND EXISTS (SELECT 1 FROM industry_categories ic2 WHERE ic2.category_id = c.id)`
      )
      .all() as { id: string }[]
    if (orphans.length > 0) {
      throw new Error(
        `대표 산업 미지정 카테고리: ${orphans.map((o) => o.id).join(', ')}`
      )
    }

    const total = db
      .prepare(`SELECT COUNT(*) n FROM industry_categories WHERE is_primary = 1`)
      .get() as { n: number }
    console.log(`\n완료 — 대표 산업 지정 ${total.n}개 카테고리`)
  } finally {
    db.close()
  }
}

main()
