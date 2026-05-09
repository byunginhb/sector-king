/**
 * GET /api/news — 발행된 마켓 리포트 목록 (anon 가능)
 *
 * 쿼리:
 *   ?limit=10  (max 50, default 10)
 *   ?status=published  (현재 published 만 지원, 향후 admin 검색용 확장 여지)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NEWS_LIST_COLUMNS, rowToListItem } from '@/lib/news/dto'
import type { ApiResponse } from '@/types'
import type { NewsReportListItem } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

interface NewsListResponse {
  items: NewsReportListItem[]
  total: number
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get('limit') ?? '10')
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, Math.trunc(limitRaw)), 50)
      : 10

    const supabase = await createClient()

    // 발행본만 — RLS `news_reports_public_read` 가 status='published' 강제
    const { data, error } = await supabase
      .from('news_reports')
      .select(NEWS_LIST_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[GET /api/news] supabase error', error.message)
      const body: ApiResponse<NewsListResponse> = {
        success: false,
        error: '리포트 목록을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const items = (data ?? []).map((row) =>
      rowToListItem(row as Parameters<typeof rowToListItem>[0])
    )
    const body: ApiResponse<NewsListResponse> = {
      success: true,
      data: { items, total: items.length },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/news] unexpected', err)
    const body: ApiResponse<NewsListResponse> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
