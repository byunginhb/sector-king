/**
 * GET  /api/admin/contributors — 인물 목록 (sort_order 오름차순)
 * POST /api/admin/contributors — 인물 신규 등록 (admin 전용)
 *
 * 저장소: Supabase. requireAdminApi() 게이팅. 수동 전용(자동 수집 없음).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { contributorInputSchema } from '@/lib/contributors/schema'
import {
  CONTRIBUTOR_COLUMNS,
  rowToDto,
  type ContributorDTO,
} from '@/lib/contributors/dto'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('contributors')
      .select(CONTRIBUTOR_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/contributors] supabase error', error.message)
      const body: ApiResponse<ContributorDTO[]> = {
        success: false,
        error: '목록을 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const items = (data ?? []).map((row) =>
      rowToDto(row as Parameters<typeof rowToDto>[0])
    )
    const body: ApiResponse<ContributorDTO[]> = { success: true, data: items }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/contributors] unexpected', err)
    const body: ApiResponse<ContributorDTO[]> = {
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
    const parsed = contributorInputSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값 검증 실패',
      }
      return NextResponse.json(body, { status: 400 })
    }
    const input = parsed.data
    const supabase = await createClient()

    const now = new Date().toISOString()
    const insertRow = {
      nickname: input.nickname,
      bio: input.bio ?? null,
      email: input.email ?? null,
      instagram_url: input.instagramUrl ?? null,
      threads_url: input.threadsUrl ?? null,
      gender: input.gender,
      avatar_variant: input.avatarVariant,
      sort_order: input.sortOrder,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('contributors')
      .insert(insertRow)
      .select(CONTRIBUTOR_COLUMNS)
      .single()

    if (error || !data) {
      console.error('[POST /api/admin/contributors] insert error', error?.message ?? 'unknown')
      const body: ApiResponse<ContributorDTO> = {
        success: false,
        error: '인물을 등록할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
    const body: ApiResponse<ContributorDTO> = { success: true, data: dto }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/contributors] unexpected', err)
    const body: ApiResponse<ContributorDTO> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
