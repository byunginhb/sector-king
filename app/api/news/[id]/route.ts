/**
 * GET /api/news/[id] — 발행된 마켓 리포트 상세 (anon 가능)
 *
 * RLS 가 status='published' 강제. 그 외 행은 PostgREST 가 not-found.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import type { ApiResponse } from '@/types'
import type { NewsReportDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!UUID_RE.test(id)) {
    const body: ApiResponse<NewsReportDTO> = {
      success: false,
      error: '잘못된 요청입니다',
    }
    return NextResponse.json(body, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('news_reports')
      .select(NEWS_FULL_COLUMNS)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[GET /api/news/[id]] supabase error', error.message)
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
    console.error('[GET /api/news/[id]] unexpected', err)
    const body: ApiResponse<NewsReportDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
