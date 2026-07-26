/**
 * POST /api/cron/analysts-sync
 *
 * 한경 컨센서스(기업 리포트) 일 증분 크롤 크론 엔드포인트(애널리스트 성적표 Phase B).
 *
 * 호출자: GitHub Actions (`.github/workflows/update-analyst-consensus.yml`)
 *   - 평일 KST 19:00 POST. workflow_dispatch 로 수동 실행 가능.
 *
 * 인증: `Authorization: Bearer <CRON_SECRET>` (requireApiKey, 타 크론과 동일).
 *
 * 동작:
 *   1. 조회 구간 = 최근 N일(기본 10일 롤링, body 로 override). 자가치유: 하루 놓쳐도 재포착.
 *   2. fetchConsensusReports → ingestReports(Supabase upsert, 멱등키가 중복 차단).
 *   3. 실패 감지: 평일인데 total=0 이면 502(토큰 로테이션/스펙 변경 조기 발견).
 *
 * 응답: ApiResponse<IngestStats & { total, from, to }>
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiKey } from '@/lib/auth/require-api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchConsensusReports } from '@/lib/analyst-consensus/hankyung'
import { ingestReports, buildCodeToTicker } from '@/lib/analyst-consensus/ingest'
import { kstToday, kstDaysAgo, isKstWeekday } from '@/lib/analyst-consensus/dates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const inputSchema = z
  .object({
    from: z.string().regex(isoDate).optional(),
    to: z.string().regex(isoDate).optional(),
    days: z.number().int().min(1).max(400).optional(),
  })
  .strict()

export async function POST(req: Request): Promise<NextResponse> {
  const guard = requireApiKey(req, 'CRON_SECRET')
  if (!guard.ok) return guard.response

  let body: z.infer<typeof inputSchema> = {}
  try {
    const raw = await req.json().catch(() => ({}))
    body = inputSchema.parse(raw ?? {})
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof z.ZodError ? e.issues[0]?.message : '잘못된 요청' },
      { status: 400 }
    )
  }

  const to = body.to ?? kstToday()
  const from = body.from ?? kstDaysAgo(body.days ?? 10)

  try {
    const { reports, total } = await fetchConsensusReports(from, to)

    // 평일인데 0건이면 API 파손 의심 → 실패로 알림(GH Actions 가 HTTP≥400 감지)
    if (total === 0 && isKstWeekday()) {
      return NextResponse.json(
        { success: false, error: `평일 크롤 결과 0건 — 한경 API 스펙 변경/토큰 로테이션 의심 (${from}~${to})` },
        { status: 502 }
      )
    }

    const stats = await ingestReports(createAdminClient(), reports, buildCodeToTicker())
    return NextResponse.json({ success: true, data: { ...stats, total, from, to } })
  } catch (e) {
    console.error('[analysts-sync] 실패:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '크롤 실패' },
      { status: 500 }
    )
  }
}
