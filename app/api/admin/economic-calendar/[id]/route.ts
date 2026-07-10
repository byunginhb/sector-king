/**
 * GET    /api/admin/economic-calendar/[id] — 단일 조회 (숨김 포함)
 * PATCH  /api/admin/economic-calendar/[id] — 부분 수정 (충돌정책 §4: 자동분 편집 시 lock 승격)
 * DELETE /api/admin/economic-calendar/[id] — 삭제 (manual=하드 / 자동분=소프트 is_hidden+is_locked)
 *
 * id 는 정수(bigint) → URL 검증 `/^\d+$/` (뉴스 UUID 정규식 아님).
 * requireAdminApi() 게이팅. params await(Next.js 15).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { eventPatchSchema } from '@/lib/economic-calendar/schema'
import {
  EVENT_FULL_COLUMNS,
  rowToDto,
  type EconomicEventDTO,
} from '@/lib/economic-calendar/dto'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const ID_RE = /^\d+$/

function badId() {
  const body: ApiResponse<EconomicEventDTO> = {
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
  if (!ID_RE.test(id)) return badId()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('economic_events')
      .select(EVENT_FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/admin/economic-calendar/[id]] supabase', error.message)
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: '이벤트를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    if (!data) {
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: '이벤트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }
    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<EconomicEventDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/economic-calendar/[id]] unexpected', err)
    const body: ApiResponse<EconomicEventDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

/** 값 필드(플래그 제외) 중 하나라도 수정 요청이 있으면 true. 자동분 lock 승격 판단용. */
function hasValueEdit(input: Record<string, unknown>): boolean {
  const valueKeys = [
    'country',
    'category',
    'importance',
    'title',
    'titleEn',
    'eventDate',
    'eventTime',
    'actual',
    'forecast',
    'previous',
    'unit',
    'relatedIndustryId',
  ]
  return valueKeys.some((k) => input[k] !== undefined)
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!ID_RE.test(id)) return badId()

  try {
    const json = await req.json().catch(() => null)
    const parsed = eventPatchSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    // 대상 행을 먼저 조회 — source 별 정책 분기(§4)에 필요.
    const { data: existing, error: readErr } = await supabase
      .from('economic_events')
      .select('id, source, is_locked')
      .eq('id', id)
      .maybeSingle()
    if (readErr) {
      console.error('[PATCH economic-calendar] read error', readErr.message)
    }
    if (!existing) {
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: '이벤트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }

    const updateRow: Record<string, unknown> = {}
    if (input.country !== undefined) updateRow.country = input.country
    if (input.category !== undefined) updateRow.category = input.category
    if (input.importance !== undefined) updateRow.importance = input.importance
    if (input.title !== undefined) updateRow.title = input.title
    if (input.titleEn !== undefined) updateRow.title_en = input.titleEn ?? null
    if (input.eventDate !== undefined) updateRow.event_date = input.eventDate
    if (input.eventTime !== undefined) updateRow.event_time = input.eventTime ?? null
    if (input.actual !== undefined) updateRow.actual = input.actual ?? null
    if (input.forecast !== undefined) updateRow.forecast = input.forecast ?? null
    if (input.previous !== undefined) updateRow.previous = input.previous ?? null
    if (input.unit !== undefined) updateRow.unit = input.unit ?? null
    if (input.relatedIndustryId !== undefined)
      updateRow.related_industry_id = input.relatedIndustryId ?? null

    // 명시 플래그 토글(자동분 소프트 삭제/복원, 수동 고정 on/off)
    if (input.isHidden !== undefined) updateRow.is_hidden = input.isHidden
    if (input.isLocked !== undefined) updateRow.is_locked = input.isLocked

    // 충돌정책 §4-2: 자동분(source!='manual') 값 필드를 고치면 lock 승격
    //   → 이후 재수집이 이 행을 건너뜀(값 보존). manual 은 항상 locked 유지.
    const isManual = existing.source === 'manual'
    if (isManual) {
      updateRow.is_locked = true
    } else if (hasValueEdit(input as Record<string, unknown>)) {
      updateRow.is_locked = true
    }

    updateRow.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('economic_events')
      .update(updateRow)
      .eq('id', id)
      .select(EVENT_FULL_COLUMNS)
      .single()

    if (error || !data) {
      console.error('[PATCH economic-calendar] update error', error?.message ?? 'unknown')
      const body: ApiResponse<EconomicEventDTO> = {
        success: false,
        error: '이벤트를 수정할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<EconomicEventDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[PATCH /api/admin/economic-calendar/[id]] unexpected', err)
    const body: ApiResponse<EconomicEventDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

interface DeleteResult {
  id: string
  soft?: boolean
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!ID_RE.test(id)) return badId()

  try {
    const supabase = await createClient()

    // 대상 행 조회 — source 별 삭제 정책 분기(§4-3).
    const { data: existing, error: readErr } = await supabase
      .from('economic_events')
      .select('id, source')
      .eq('id', id)
      .maybeSingle()
    if (readErr) {
      console.error('[DELETE economic-calendar] read error', readErr.message)
    }
    if (!existing) {
      const body: ApiResponse<DeleteResult> = {
        success: false,
        error: '이벤트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }

    // manual: 하드 삭제(재수집이 되살리지 않음).
    if (existing.source === 'manual') {
      const { error } = await supabase
        .from('economic_events')
        .delete()
        .eq('id', id)
      if (error) {
        console.error('[DELETE economic-calendar] hard delete error', error.message)
        const body: ApiResponse<DeleteResult> = {
          success: false,
          error: '이벤트를 삭제할 수 없습니다',
        }
        return NextResponse.json(body, { status: 500 })
      }
      const body: ApiResponse<DeleteResult> = { success: true, data: { id } }
      return NextResponse.json(body)
    }

    // 자동분: 소프트 삭제 = is_hidden=true + is_locked=true (재수집이 값은 갱신해도 숨김/고정 유지).
    const { error } = await supabase
      .from('economic_events')
      .update({
        is_hidden: true,
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) {
      console.error('[DELETE economic-calendar] soft delete error', error.message)
      const body: ApiResponse<DeleteResult> = {
        success: false,
        error: '이벤트를 숨길 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    const body: ApiResponse<DeleteResult> = {
      success: true,
      data: { id, soft: true },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[DELETE /api/admin/economic-calendar/[id]] unexpected', err)
    const body: ApiResponse<DeleteResult> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
