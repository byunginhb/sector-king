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

/**
 * 데이터 수집 주기 — metadata·본문·JSON-LD 가 같은 문구를 쓰도록 여기서만 정의한다("실시간" 금지).
 *
 * 값의 근거는 `.github/workflows/update-data.yml` 의 cron 4개다. 문자열을 손으로 바꾸지 말고
 * 워크플로를 먼저 확인할 것 — 이전 값("1일 2회")은 어느 시점의 옛 푸터 문구가 검증 없이
 * 굳어진 것이었고, 실제 cron 과 어긋난 채로 전 페이지에 노출되고 있었다.
 *
 * 화면 반영도 같은 주기다 — 배포된 DB 는 빌드 시점에 db-snapshot 에서 받아온 파일인데,
 * 워크플로 마지막 `Trigger site rebuild` 스텝이 수집 직후 Vercel Deploy Hook 을 쳐서
 * 재배포한다. (그 훅을 붙이기 전에는 수집 4회/일 vs 반영 약 1회/일로 벌어져 있었다.)
 * 그래도 사용자에게 최종 근거는 각 화면에 찍히는 "데이터 기준일"이다.
 */
export const UPDATE_CADENCE = '평일 1일 4회(KST 07:00 · 12:00 · 16:30 · 22:00)'
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
