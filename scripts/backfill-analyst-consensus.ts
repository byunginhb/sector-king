/**
 * 한경 컨센서스(기업 리포트) 1년치 백필 — 1회 실행.
 *
 * 실행: pnpm tsx scripts/backfill-analyst-consensus.ts
 *   (.env.local 자동 로드 시도, 없으면 shell env 사용)
 *
 * 이후 일 증분은 /api/cron/analysts-sync (GitHub Actions) 가 담당.
 * 멱등: external_id 유일키로 재실행해도 중복 0.
 *
 * 의존: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE, data/hegemony.db(티커 매칭).
 */
import { createClient } from '@supabase/supabase-js'
import { fetchConsensusReports } from '@/lib/analyst-consensus/hankyung'
import { ingestReports, buildCodeToTicker } from '@/lib/analyst-consensus/ingest'
import { kstToday, kstDaysAgo } from '@/lib/analyst-consensus/dates'

// Node 20.12+ 내장 .env 로더(가능하면). 실패해도 shell env / --env-file 로 진행.
const loadEnvFile = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile
for (const f of ['.env.local', '.env']) {
  try {
    loadEnvFile?.(f)
  } catch {
    /* 파일 없음 — 다음 후보 */
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    console.error('[backfill] 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE 필요')
    process.exit(1)
  }
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const to = kstToday()
  const from = kstDaysAgo(365)
  console.log(`[backfill] 한경 컨센서스 크롤: ${from} ~ ${to}`)

  const { reports, total } = await fetchConsensusReports(from, to)
  console.log(`[backfill] 서버 보고 총 ${total}건, 수집 ${reports.length}건`)

  const codeToTicker = buildCodeToTicker()
  console.log(`[backfill] 우리 KR 티커 매칭 대상 ${codeToTicker.size}종목`)

  const stats = await ingestReports(supabase, reports, codeToTicker)
  console.log('[backfill] 완료:', JSON.stringify(stats, null, 2))
  console.log(
    `[backfill] matched=${stats.matched}/${stats.reports} ` +
      `(미매칭 ${stats.reports - stats.matched}건 = 옵션2 확장 후보)`
  )
}

main().catch((e) => {
  console.error('[backfill] 실패:', e)
  process.exit(1)
})
