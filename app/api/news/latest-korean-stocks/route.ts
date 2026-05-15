/**
 * GET /api/news/latest-korean-stocks
 *
 * 메인 페이지의 '추천 한국 종목' 카드용 — 가장 최근 발행 리포트의
 * noviceView.koreanStocks 만 잘라서 반환한다 (전체 본문은 미포함).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'
import type { NoviceKoreanStockItem } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

interface KoreanPicksResponse {
  reportId: string
  reportTitle: string
  reportDate: string
  publishedAt: string | null
  picks: NoviceKoreanStockItem[]
}

interface NoviceRow {
  id: string
  title: string
  report_date: string
  published_at: string | null
  novice_view: { koreanStocks?: NoviceKoreanStockItem[] } | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('news_reports')
      .select('id, title, report_date, published_at, novice_view')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle<NoviceRow>()

    if (error) {
      console.error('[GET /api/news/latest-korean-stocks] supabase error', error.message)
      const body: ApiResponse<KoreanPicksResponse> = {
        success: false,
        error: '추천 종목을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    if (!data) {
      const body: ApiResponse<KoreanPicksResponse | null> = {
        success: true,
        data: null,
      }
      return NextResponse.json(body)
    }

    const picks = data.novice_view?.koreanStocks ?? []
    const body: ApiResponse<KoreanPicksResponse> = {
      success: true,
      data: {
        reportId: data.id,
        reportTitle: data.title,
        reportDate: data.report_date,
        publishedAt: data.published_at,
        picks,
      },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/news/latest-korean-stocks] unexpected', err)
    const body: ApiResponse<KoreanPicksResponse> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
