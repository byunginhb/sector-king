import 'server-only'
import { cache } from 'react'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { companies, industries, sectors, dailySnapshots } from '@/drizzle/schema'

/**
 * 사이트 전역에 노출되는 "우리가 뭘 얼마나 추적하는가" 수치의 단일 원천(SoT).
 *
 * 배경: 푸터는 "120+ 기업 / 9개 산업", 방법론은 "30+ 섹터 / 120+ 기업" 이라고 손으로 적어뒀는데
 * 실제 DB 는 600여 종목이라 sitemap 과 본문 수치가 3~5배 어긋나 있었다. 검색·답변 엔진 입장에서
 * 이런 자가당착은 신뢰도 신호를 깎아먹으므로, 표시 수치는 전부 여기서만 만든다.
 */
export interface SiteFacts {
  companyCount: number
  industryCount: number
  sectorCount: number
  /** 최신 스냅샷 일자 (YYYY-MM-DD). 데이터가 없으면 null. */
  latestDataDate: string | null
}

/** 데이터 갱신 주기 — metadata·본문·JSON-LD 가 같은 문구를 쓰도록 여기서만 정의한다("실시간" 금지). */
export const UPDATE_CADENCE = '평일 1일 2회(KST 16:30 / 익일 07:00)'
export const DATA_SOURCE = 'Yahoo Finance'

/** 같은 렌더 패스 안에서는 한 번만 조회 (푸터 + 본문이 동시에 부르는 경우 대비). */
export const getSiteFacts = cache(async (): Promise<SiteFacts> => {
  const db = getDb()
  const n = sql<number>`count(*)`

  const [companyRows, industryRows, sectorRows, latestRows] = await Promise.all([
    db.select({ n }).from(companies),
    db.select({ n }).from(industries),
    db.select({ n }).from(sectors),
    db.select({ d: sql<string | null>`max(${dailySnapshots.date})` }).from(dailySnapshots),
  ])

  return {
    companyCount: companyRows[0]?.n ?? 0,
    industryCount: industryRows[0]?.n ?? 0,
    sectorCount: sectorRows[0]?.n ?? 0,
    latestDataDate: latestRows[0]?.d ?? null,
  }
})
