/**
 * GET  /api/me/recently-viewed — 최근 본 종목 (sorted by viewed_at desc, max 50)
 * POST /api/me/recently-viewed — 기록 (upsert + 트리거가 50개 prune)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import {
  RECENTLY_VIEWED_COLUMNS,
  rowToRecentlyViewedDto,
} from '@/lib/me/dto'
import { recentlyViewedTrackSchema } from '@/lib/me/schema'
import type { ApiResponse } from '@/types'
import type { RecentlyViewedItemDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

interface RecentlyViewedResponse {
  items: RecentlyViewedItemDTO[]
  total: number
}

export async function GET(req: Request) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get('limit') ?? '20')
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, Math.trunc(limitRaw)), 50)
      : 20

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('recently_viewed')
      .select(RECENTLY_VIEWED_COLUMNS)
      .eq('user_id', guard.profile.id)
      .order('viewed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[GET /api/me/recently-viewed] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '최근 본 종목을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const items = (data ?? []).map((row) =>
      rowToRecentlyViewedDto(row as Parameters<typeof rowToRecentlyViewedDto>[0])
    )
    const body: ApiResponse<RecentlyViewedResponse> = {
      success: true,
      data: { items, total: items.length },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/me/recently-viewed]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function POST(req: Request) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const json = await req.json().catch(() => null)
    const parsed = recentlyViewedTrackSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const payload = {
      user_id: guard.profile.id,
      item_type: parsed.data.itemType,
      item_key: parsed.data.itemKey,
      display_name: parsed.data.displayName ?? null,
      viewed_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('recently_viewed')
      .upsert(payload, { onConflict: 'user_id,item_type,item_key' })
      .select(RECENTLY_VIEWED_COLUMNS)
      .single()

    if (error) {
      console.error('[POST /api/me/recently-viewed] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '최근 본 종목 기록 실패',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const item = rowToRecentlyViewedDto(
      data as Parameters<typeof rowToRecentlyViewedDto>[0]
    )
    const body: ApiResponse<{ item: RecentlyViewedItemDTO }> = {
      success: true,
      data: { item },
    }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/me/recently-viewed]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
