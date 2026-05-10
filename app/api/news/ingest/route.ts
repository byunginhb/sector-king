/**
 * POST /api/news/ingest
 *
 * 외부 자동화(스크립트/봇/Edge Function 등) 가 마켓 리포트를 적재하는 엔드포인트.
 *
 * 인증: Authorization: Bearer <NEWS_INGEST_API_KEY>  (또는 X-API-Key 헤더)
 * 입력: docs/news-format.json 의 schema 와 1:1 일치
 * 멱등: (reportDate + title) 매칭 행이 있으면 update, 없으면 insert
 * RLS: service_role 키로 우회 (lib/supabase/admin.ts)
 *
 * 응답:
 *   200/201 { success: true, data: { id, status, reportDate, publishedAt, action: 'created'|'updated' } }
 *   400 { success: false, error, issues? }   — zod 검증 실패
 *   401 { success: false, error }            — 인증 실패
 *   500 { success: false, error }            — 서버 에러
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireApiKey } from '@/lib/auth/require-api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import { newsReportInputSchema } from '@/lib/news/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IngestResult {
  id: string
  status: string
  reportDate: string
  publishedAt: string | null
  action: 'created' | 'updated'
}

export async function POST(req: Request) {
  const guard = requireApiKey(req, 'NEWS_INGEST_API_KEY')
  if (!guard.ok) return guard.response

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: '유효한 JSON 본문이 필요합니다' },
      { status: 400 }
    )
  }

  let parsed: ReturnType<typeof newsReportInputSchema.parse>
  try {
    parsed = newsReportInputSchema.parse(payload)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 검증 실패',
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 }
      )
    }
    throw err
  }

  const admin = createAdminClient()

  const row = {
    title: parsed.title,
    status: parsed.status,
    report_date: parsed.reportDate,
    one_line_conclusion: parsed.oneLineConclusion ?? null,
    cover_keywords: parsed.coverKeywords,
    expert_view: parsed.expertView,
    novice_view: parsed.noviceView,
    published_at:
      parsed.status === 'published' ? new Date().toISOString() : null,
  }

  // 멱등: (report_date, title) 조합으로 기존 행 조회
  const { data: existing, error: lookupErr } = await admin
    .from('news_reports')
    .select('id, status')
    .eq('report_date', parsed.reportDate)
    .eq('title', parsed.title)
    .maybeSingle()

  if (lookupErr) {
    console.error('[news.ingest] lookup error', lookupErr)
    return NextResponse.json(
      { success: false, error: 'DB 조회 실패' },
      { status: 500 }
    )
  }

  let result: IngestResult

  if (existing?.id) {
    // 기존 → update (status 가 published 로 바뀌었고 published_at 이 비어있다면 채움)
    const updatePayload = {
      ...row,
      published_at:
        parsed.status === 'published'
          ? row.published_at
          : existing.status === 'published'
            ? undefined // 기존 발행 상태 유지 — null 로 덮지 않기 위해 undefined
            : null,
    }
    const { data: updated, error: updateErr } = await admin
      .from('news_reports')
      .update(updatePayload)
      .eq('id', existing.id)
      .select('id, status, report_date, published_at')
      .single()

    if (updateErr || !updated) {
      console.error('[news.ingest] update error', updateErr)
      return NextResponse.json(
        { success: false, error: 'update 실패' },
        { status: 500 }
      )
    }
    result = {
      id: updated.id,
      status: updated.status,
      reportDate: updated.report_date,
      publishedAt: updated.published_at,
      action: 'updated',
    }
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  }

  // 신규 insert
  const { data: inserted, error: insertErr } = await admin
    .from('news_reports')
    .insert(row)
    .select('id, status, report_date, published_at')
    .single()

  if (insertErr || !inserted) {
    console.error('[news.ingest] insert error', insertErr)
    return NextResponse.json(
      { success: false, error: 'insert 실패' },
      { status: 500 }
    )
  }

  result = {
    id: inserted.id,
    status: inserted.status,
    reportDate: inserted.report_date,
    publishedAt: inserted.published_at,
    action: 'created',
  }
  return NextResponse.json({ success: true, data: result }, { status: 201 })
}
