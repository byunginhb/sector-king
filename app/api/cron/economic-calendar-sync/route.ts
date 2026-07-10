/**
 * POST /api/cron/economic-calendar-sync
 *
 * FRED 경제지표 발표일정 자동수집 크론 엔드포인트(경제 캘린더 Phase B).
 *
 * 호출자: GitHub Actions (`.github/workflows/update-economic-calendar.yml`)
 *   - 하루 1회(평일 KST 06:00) POST. workflow_dispatch 로 수동 실행 가능.
 *
 * 인증: `Authorization: Bearer <CRON_SECRET>` (또는 `X-API-Key`)
 *   - timing-safe compare (`requireApiKey` 재사용, daily-news-email 와 동일 방식)
 *   - CRON_SECRET 미설정 시 503
 *
 * 동작:
 *   1. FRED_API_KEY 확인(없으면 500)
 *   2. 조회 구간 = 오늘(KST) ~ +2개월(기본, body 로 override 가능)
 *   3. `fetchFredReleaseDates` → 매핑된 US 지표 이벤트 배열 생성(ET→KST 변환)
 *   4. is_locked=true 인 기존 행은 제외(수동 고정 보존)
 *   5. 나머지를 economic_events 에 upsert(onConflict: source,external_id)
 *      - is_hidden / is_locked 는 SET 하지 않음(기존 값 보존)
 *
 * 응답: ApiResponse<{ fetched, upserted, skippedLocked }>
 *   - 값은 문자열 원문/미정(actual 등 null) → toUsd 무관
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiKey } from '@/lib/auth/require-api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchFredReleaseDates,
  mapReleaseDatesToEvents,
  assertReleaseNameMatch,
} from '@/lib/economic-calendar/fred'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const inputSchema = z
  .object({
    from: z.string().regex(isoDate, 'from 은 YYYY-MM-DD 형식이어야 합니다').optional(),
    to: z.string().regex(isoDate, 'to 는 YYYY-MM-DD 형식이어야 합니다').optional(),
  })
  .strict()

interface SyncResult {
  fetched: number
  upserted: number
  skippedLocked: number
}

/** KST 기준 오늘 'YYYY-MM-DD' */
function kstToday(): string {
  const parts: Record<string, string> = {}
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  for (const p of dtf.formatToParts(new Date())) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** 'YYYY-MM-DD' 에 일수를 더한 'YYYY-MM-DD' (UTC 기준 산술 — 날짜 계산용) */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000
  const dt = new Date(ms)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export async function POST(req: Request) {
  const guard = requireApiKey(req, 'CRON_SECRET')
  if (!guard.ok) return guard.response

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: 'FRED_API_KEY 환경변수가 설정되지 않아 자동수집을 실행할 수 없습니다',
      },
      { status: 500 }
    )
  }

  // body 는 옵션 (없어도 동작)
  let from: string
  let to: string
  try {
    const raw = await req.json().catch(() => ({}))
    const parsed = inputSchema.safeParse(raw ?? {})
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '입력 검증 실패',
        },
        { status: 400 }
      )
    }
    const today = kstToday()
    from = parsed.data.from ?? today
    to = parsed.data.to ?? addDays(today, 62) // 기본 약 2개월
  } catch (err) {
    console.error('[econ-calendar.sync] body parse error', err)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: '요청 본문 처리 중 오류가 발생했습니다' },
      { status: 400 }
    )
  }

  try {
    const releaseDates = await fetchFredReleaseDates(apiKey, { from, to })
    for (const rd of releaseDates) assertReleaseNameMatch(rd)

    const rows = mapReleaseDatesToEvents(releaseDates, new Date().toISOString())

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<SyncResult>>(
        { success: true, data: { fetched: 0, upserted: 0, skippedLocked: 0 } },
        { status: 200 }
      )
    }

    const admin = createAdminClient()
    const externalIds = rows.map((r) => r.external_id)

    // is_locked=true(수동 고정) 행은 값 갱신에서 완전 제외
    const { data: lockedRows, error: lockedErr } = await admin
      .from('economic_events')
      .select('external_id')
      .eq('source', 'fred')
      .eq('is_locked', true)
      .in('external_id', externalIds)

    if (lockedErr) {
      console.error('[econ-calendar.sync] locked lookup error', lockedErr)
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: 'DB 조회 실패' },
        { status: 500 }
      )
    }

    const lockedSet = new Set(
      (lockedRows ?? []).map((r: { external_id: string }) => r.external_id)
    )
    const upsertRows = rows.filter((r) => !lockedSet.has(r.external_id))

    let upserted = 0
    if (upsertRows.length > 0) {
      // is_hidden / is_locked 는 row 에 포함하지 않음 →
      // 신규는 DB default(false), 기존은 값 보존(SET 미포함).
      const { error: upsertErr } = await admin
        .from('economic_events')
        .upsert(upsertRows, { onConflict: 'source,external_id' })

      if (upsertErr) {
        console.error('[econ-calendar.sync] upsert error', upsertErr)
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: 'upsert 실패' },
          { status: 500 }
        )
      }
      upserted = upsertRows.length
    }

    return NextResponse.json<ApiResponse<SyncResult>>(
      {
        success: true,
        data: {
          fetched: rows.length,
          upserted,
          skippedLocked: lockedSet.size,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[econ-calendar.sync] fatal', err)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: '자동수집 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
