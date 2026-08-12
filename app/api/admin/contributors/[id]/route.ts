/**
 * GET    /api/admin/contributors/[id] — 단일 조회
 * PATCH  /api/admin/contributors/[id] — 부분 수정
 * DELETE /api/admin/contributors/[id] — 하드 삭제 (수동 데이터 → 소프트 삭제 불필요)
 *
 * id 는 정수(bigint) → `/^\d+$/`. requireAdminApi() 게이팅. params await(Next.js 15).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { contributorPatchSchema } from '@/lib/contributors/schema'
import {
  CONTRIBUTOR_COLUMNS,
  rowToDto,
  type ContributorDTO,
} from '@/lib/contributors/dto'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const ID_RE = /^\d+$/

function badId<T>() {
  const body: ApiResponse<T> = { success: false, error: '잘못된 요청입니다' }
  return NextResponse.json(body, { status: 400 })
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await context.params
  if (!ID_RE.test(id)) return badId<ContributorDTO>()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('contributors')
      .select(CONTRIBUTOR_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/admin/contributors/[id]] supabase', error.message)
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: '인물을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    if (!data) {
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: '인물을 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }
    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<ContributorDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/contributors/[id]] unexpected', err)
    const body: ApiResponse<ContributorDTO> = {
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
  if (!ID_RE.test(id)) return badId<ContributorDTO>()

  try {
    const json = await req.json().catch(() => null)
    const parsed = contributorPatchSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    const updateRow: Record<string, unknown> = {}
    if (input.nickname !== undefined) updateRow.nickname = input.nickname
    if (input.bio !== undefined) updateRow.bio = input.bio ?? null
    if (input.email !== undefined) updateRow.email = input.email ?? null
    if (input.instagramUrl !== undefined)
      updateRow.instagram_url = input.instagramUrl ?? null
    if (input.threadsUrl !== undefined)
      updateRow.threads_url = input.threadsUrl ?? null
    if (input.linkedinUrl !== undefined)
      updateRow.linkedin_url = input.linkedinUrl ?? null
    if (input.blogUrl !== undefined)
      updateRow.blog_url = input.blogUrl ?? null
    if (input.gender !== undefined) updateRow.gender = input.gender
    if (input.avatarVariant !== undefined)
      updateRow.avatar_variant = input.avatarVariant
    if (input.sortOrder !== undefined) updateRow.sort_order = input.sortOrder
    updateRow.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('contributors')
      .update(updateRow)
      .eq('id', id)
      .select(CONTRIBUTOR_COLUMNS)
      .maybeSingle()

    if (error) {
      console.error('[PATCH /api/admin/contributors/[id]] update error', error.message)
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: '인물을 수정할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    if (!data) {
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: '인물을 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<ContributorDTO> = { success: true, data: dto }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[PATCH /api/admin/contributors/[id]] unexpected', err)
    const body: ApiResponse<ContributorDTO> = {
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
  if (!ID_RE.test(id)) return badId<{ id: string }>()

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('contributors').delete().eq('id', id)
    if (error) {
      console.error('[DELETE /api/admin/contributors/[id]] error', error.message)
      const body: ApiResponse<{ id: string }> = {
        success: false,
        error: '인물을 삭제할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    const body: ApiResponse<{ id: string }> = { success: true, data: { id } }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[DELETE /api/admin/contributors/[id]] unexpected', err)
    const body: ApiResponse<{ id: string }> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
