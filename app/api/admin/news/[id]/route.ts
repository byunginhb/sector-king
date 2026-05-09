/**
 * GET /api/admin/news/[id]    — 리포트 단일 조회 (모든 status)
 * PATCH /api/admin/news/[id]  — 부분 업데이트
 * DELETE /api/admin/news/[id] — 삭제
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { newsReportPatchSchema } from '@/lib/news/schema'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import type { ApiResponse } from '@/types'
import type { NewsReportDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function badId() {
  const body: ApiResponse<NewsReportDTO> = {
    success: false,
    error: '잘못된 요청입니다',
  }
  return NextResponse.json(body, { status: 400 })
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!UUID_RE.test(id)) return badId()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('news_reports')
      .select(NEWS_FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/admin/news/[id]] supabase', error.message)
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: '리포트를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    if (!data) {
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }
    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<NewsReportDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/news/[id]] unexpected', err)
    const body: ApiResponse<NewsReportDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!UUID_RE.test(id)) return badId()

  try {
    const json = await req.json().catch(() => null)
    const parsed = newsReportPatchSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    // 현재 행을 읽어 published 전환 시점에만 published_at 새로 부여
    const { data: existing, error: readErr } = await supabase
      .from('news_reports')
      .select('id, status, published_at')
      .eq('id', id)
      .maybeSingle()
    if (readErr) {
      console.error('[PATCH] read error', readErr.message)
    }
    if (!existing) {
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }

    const updateRow: Record<string, unknown> = {}
    if (input.title !== undefined) updateRow.title = input.title
    if (input.status !== undefined) updateRow.status = input.status
    if (input.reportDate !== undefined) updateRow.report_date = input.reportDate
    if (input.oneLineConclusion !== undefined)
      updateRow.one_line_conclusion = input.oneLineConclusion ?? null
    if (input.coverKeywords !== undefined)
      updateRow.cover_keywords = input.coverKeywords
    if (input.expertView !== undefined) updateRow.expert_view = input.expertView
    if (input.noviceView !== undefined) updateRow.novice_view = input.noviceView

    // 발행 전환 시점에 published_at 자동 부여 (이미 발행이면 보존)
    if (input.status === 'published' && existing.status !== 'published') {
      updateRow.published_at = new Date().toISOString()
    }
    // archived/draft 전환 시 published_at 보존 (히스토리 유지)

    const { data, error } = await supabase
      .from('news_reports')
      .update(updateRow)
      .eq('id', id)
      .select(NEWS_FULL_COLUMNS)
      .single()

    if (error || !data) {
      console.error('[PATCH] update error', error?.message ?? 'unknown')
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: '리포트를 수정할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<NewsReportDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[PATCH /api/admin/news/[id]] unexpected', err)
    const body: ApiResponse<NewsReportDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!UUID_RE.test(id)) return badId()

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('news_reports')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('[DELETE] error', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '리포트를 삭제할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    const body: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[DELETE] unexpected', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
