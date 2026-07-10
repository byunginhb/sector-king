/**
 * GET  /api/admin/economic-calendar — 관리자 목록 (날짜/국가/카테고리/source/importance 필터)
 * POST /api/admin/economic-calendar — 신규 경제 이벤트 수동 생성 (admin 전용)
 *
 * 저장소: Supabase(뉴스와 동일 `createClient()`). requireAdminApi() 게이팅.
 * 값(actual/forecast/previous)은 원문 문자열 → toUsd 불요.
 * 일시는 KST 확정값(어드민 입력=KST, 이중변환 금지).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import {
  eventInputSchema,
  adminEventListQuerySchema,
} from '@/lib/economic-calendar/schema'
import {
  EVENT_FULL_COLUMNS,
  EVENT_LIST_COLUMNS,
  rowToDto,
  rowToListItem,
  type EconomicEventDTO,
  type EconomicEventListItem,
} from '@/lib/economic-calendar/dto'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

interface AdminListResponse {
  items: EconomicEventListItem[]
  total: number
}

export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const url = new URL(req.url)
    const parsed = adminEventListQuerySchema.safeParse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      country: url.searchParams.get('country') ?? 'all',
      category: url.searchParams.get('category') ?? 'all',
      source: url.searchParams.get('source') ?? 'all',
      importance: url.searchParams.get('importance') ?? 'all',
      includeHidden: url.searchParams.get('includeHidden') ?? true,
      limit: url.searchParams.get('limit') ?? 100,
    })
    if (!parsed.success) {
      const body: ApiResponse<AdminListResponse> = {
        success: false,
        error: '잘못된 쿼리 파라미터',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const { from, to, country, category, source, importance, includeHidden, limit } =
      parsed.data
    const supabase = await createClient()

    let query = supabase
      .from('economic_events')
      .select(EVENT_LIST_COLUMNS)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (from) query = query.gte('event_date', from)
    if (to) query = query.lte('event_date', to)
    if (country !== 'all') query = query.eq('country', country)
    if (category !== 'all') query = query.eq('category', category)
    if (source !== 'all') query = query.eq('source', source)
    if (importance !== 'all') query = query.eq('importance', importance)
    if (!includeHidden) query = query.eq('is_hidden', false)

    const { data, error } = await query
    if (error) {
      console.error('[GET /api/admin/economic-calendar] supabase error', error.message)
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
    console.error('[GET /api/admin/economic-calendar] unexpected', err)
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
    const parsed = eventInputSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    const now = new Date().toISOString()
    // 서버 강제/생성 필드:
    // - source='manual' (클라이언트 값 무시)
    // - external_id='manual:'+uuid (NOT NULL, 슬러그 충돌 회피)
    // - is_hidden=false, is_locked=true (수동 생성 행은 재수집 대상 아님 → 항상 lock)
    const insertRow = {
      source: 'manual',
      external_id: `manual:${crypto.randomUUID()}`,
      country: input.country,
      category: input.category,
      importance: input.importance,
      title: input.title,
      title_en: input.titleEn ?? null,
      event_date: input.eventDate,
      event_time: input.eventTime ?? null,
      actual: input.actual ?? null,
      forecast: input.forecast ?? null,
      previous: input.previous ?? null,
      unit: input.unit ?? null,
      related_industry_id: input.relatedIndustryId ?? null,
      is_hidden: false,
      is_locked: true,
      created_by: guard.profile.id,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('economic_events')
      .insert(insertRow)
      .select(EVENT_FULL_COLUMNS)
      .single()

    if (error || !data) {
      console.error(
        '[POST /api/admin/economic-calendar] insert error',
        error?.message ?? 'unknown'
      )
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: '이벤트를 생성할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<EconomicEventDTO> = { success: true, data: dto }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/economic-calendar] unexpected', err)
    const body: ApiResponse<EconomicEventDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
