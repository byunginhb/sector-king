/**
 * POST /api/admin/news — 신규 마켓 리포트 작성 (admin 전용)
 * GET  /api/admin/news — 관리자 목록 (status 필터 + 검색)
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { newsReportInputSchema } from '@/lib/news/schema'
import {
  NEWS_FULL_COLUMNS,
  NEWS_LIST_COLUMNS,
  rowToDto,
  rowToListItem,
} from '@/lib/news/dto'
import type { ApiResponse } from '@/types'
import type {
  NewsReportDTO,
  NewsReportListItem,
} from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

const adminListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived', 'all']).default('all'),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

interface AdminListResponse {
  items: NewsReportListItem[]
  total: number
}

export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const url = new URL(req.url)
    const parsed = adminListQuerySchema.safeParse({
      status: url.searchParams.get('status') ?? 'all',
      q: url.searchParams.get('q') ?? undefined,
      limit: url.searchParams.get('limit') ?? 30,
    })
    if (!parsed.success) {
      const body: ApiResponse<AdminListResponse> = {
        success: false,
        error: '잘못된 쿼리 파라미터',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const { status, q, limit } = parsed.data
    const supabase = await createClient()
    let query = supabase
      .from('news_reports')
      .select(NEWS_LIST_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (q && q.trim()) {
      // 제목 ILIKE
      query = query.ilike('title', `%${q.trim()}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('[GET /api/admin/news] supabase error', error.message)
      const body: ApiResponse<AdminListResponse> = {
        success: false,
        error: '목록을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const items = (data ?? []).map((row) =>
      rowToListItem(row as Parameters<typeof rowToListItem>[0])
    )
    const body: ApiResponse<AdminListResponse> = {
      success: true,
      data: { items, total: items.length },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/news] unexpected', err)
    const body: ApiResponse<AdminListResponse> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function POST(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const json = await req.json().catch(() => null)
    const parsed = newsReportInputSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    const insertRow = {
      title: input.title,
      status: input.status,
      report_date: input.reportDate,
      one_line_conclusion: input.oneLineConclusion ?? null,
      cover_keywords: input.coverKeywords,
      expert_view: input.expertView,
      novice_view: input.noviceView,
      published_at:
        input.status === 'published' ? new Date().toISOString() : null,
      created_by: guard.profile.id,
    }

    const { data, error } = await supabase
      .from('news_reports')
      .insert(insertRow)
      .select(NEWS_FULL_COLUMNS)
      .single()

    if (error || !data) {
      console.error(
        '[POST /api/admin/news] insert error',
        error?.message ?? 'unknown'
      )
      const body: ApiResponse<NewsReportDTO> = {
        success: false,
        error: '리포트를 생성할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<NewsReportDTO> = { success: true, data: dto }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/news] unexpected', err)
    const body: ApiResponse<NewsReportDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
