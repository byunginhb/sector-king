/**
 * GET  /api/me/watchlist — 본인 워치리스트 (옵션: ?itemType=ticker|sector|industry)
 * POST /api/me/watchlist — 추가 (멱등: 이미 있으면 200, 200개 초과 시 422)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { getIndexableSectors } from '@/lib/sector-server'
import {
  WATCHLIST_COLUMNS,
  rowToWatchlistDto,
} from '@/lib/me/dto'
import {
  watchlistAddSchema,
  watchlistFilterSchema,
} from '@/lib/me/schema'
import type { ApiResponse } from '@/types'
import type { WatchlistItemDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

/**
 * 상세 페이지가 존재하는 섹터 id 집합.
 *
 * 실패해도 워치리스트 자체는 살린다 — 그때 섹터는 링크되지 않을 뿐이고,
 * 그 방향이 404 로 보내는 것보다 낫다(fail-closed).
 */
async function linkableSectorIds(): Promise<ReadonlySet<string>> {
  try {
    const sectors = await getIndexableSectors()
    return new Set(sectors.map((s) => s.id))
  } catch (error) {
    console.error('[watchlist] 섹터 목록 조회 실패 — 섹터는 비링크로 렌더', error)
    return new Set()
  }
}

interface WatchlistListResponse {
  items: WatchlistItemDTO[]
  total: number
}

export async function GET(req: Request) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const url = new URL(req.url)
    const parsed = watchlistFilterSchema.safeParse({
      itemType: url.searchParams.get('itemType') ?? undefined,
    })
    if (!parsed.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: 'itemType 파라미터가 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    let query = supabase
      .from('watchlist')
      .select(WATCHLIST_COLUMNS)
      .eq('user_id', guard.profile.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (parsed.data.itemType) {
      query = query.eq('item_type', parsed.data.itemType)
    }

    const { data, error } = await query
    if (error) {
      console.error('[GET /api/me/watchlist] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '워치리스트를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    // 섹터는 상세 페이지가 있는 것만 링크한다(종목 3개 미만은 페이지가 없다).
    // `/sectors` 인덱스·sitemap 과 같은 원천을 봐야 "목록엔 있는데 404" 가 없다.
    const linkableSectors = await linkableSectorIds()

    const items = (data ?? []).map((row) =>
      rowToWatchlistDto(
        row as Parameters<typeof rowToWatchlistDto>[0],
        linkableSectors
      )
    )
    const body: ApiResponse<WatchlistListResponse> = {
      success: true,
      data: { items, total: items.length },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/me/watchlist]', err)
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
    const parsed = watchlistAddSchema.safeParse(json)
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
      note: parsed.data.note ?? null,
      pinned: parsed.data.pinned ?? false,
    }

    const { data, error } = await supabase
      .from('watchlist')
      .upsert(payload, { onConflict: 'user_id,item_type,item_key' })
      .select(WATCHLIST_COLUMNS)
      .single()

    if (error) {
      // 200개 한도 트리거가 raise — error.message 에 "워치리스트는 최대" 포함
      if (error.message?.includes('워치리스트')) {
        const body: ApiResponse<never> = {
          success: false,
          error: '워치리스트는 최대 200개까지 추가 가능합니다',
        }
        return NextResponse.json(body, { status: 422 })
      }
      console.error('[POST /api/me/watchlist] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '워치리스트 추가 실패',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const item = rowToWatchlistDto(
      data as Parameters<typeof rowToWatchlistDto>[0],
      await linkableSectorIds()
    )
    const body: ApiResponse<{ item: WatchlistItemDTO }> = {
      success: true,
      data: { item },
    }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/me/watchlist]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
