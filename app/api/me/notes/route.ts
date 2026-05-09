/**
 * GET  /api/me/notes  — 본인 메모 목록 (?itemType, ?itemKey 필터)
 * POST /api/me/notes  — upsert: 동일 (item_type, item_key) 가 있으면 body 갱신, 없으면 생성
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { NOTE_COLUMNS, rowToNoteDto } from '@/lib/me/dto'
import { noteUpsertSchema, notesFilterSchema } from '@/lib/me/schema'
import type { ApiResponse } from '@/types'
import type { NoteDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

interface NotesListResponse {
  items: NoteDTO[]
  total: number
}

export async function GET(req: Request) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const url = new URL(req.url)
    const parsed = notesFilterSchema.safeParse({
      itemType: url.searchParams.get('itemType') ?? undefined,
      itemKey: url.searchParams.get('itemKey') ?? undefined,
    })
    if (!parsed.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: '필터 파라미터가 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    let query = supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .eq('user_id', guard.profile.id)
      .order('updated_at', { ascending: false })

    if (parsed.data.itemType) query = query.eq('item_type', parsed.data.itemType)
    if (parsed.data.itemKey) query = query.eq('item_key', parsed.data.itemKey)

    const { data, error } = await query
    if (error) {
      console.error('[GET /api/me/notes] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '메모를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const items = (data ?? []).map((row) =>
      rowToNoteDto(row as Parameters<typeof rowToNoteDto>[0])
    )
    const body: ApiResponse<NotesListResponse> = {
      success: true,
      data: { items, total: items.length },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/me/notes]', err)
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
    const parsed = noteUpsertSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const userId = guard.profile.id

    // (user_id, item_type, item_key) UNIQUE 제약 (마이그레이션 0004)을 활용한 단일 upsert.
    // race-condition 안전: find→update/insert 분기 제거.
    const { data, error } = await supabase
      .from('notes')
      .upsert(
        {
          user_id: userId,
          item_type: parsed.data.itemType,
          item_key: parsed.data.itemKey,
          body: parsed.data.body,
        },
        { onConflict: 'user_id,item_type,item_key' }
      )
      .select(NOTE_COLUMNS)
      .single()

    if (error) {
      if (error.message?.includes('메모는 최대')) {
        const body: ApiResponse<never> = {
          success: false,
          error: '메모는 최대 10,000자까지 작성 가능합니다',
        }
        return NextResponse.json(body, { status: 422 })
      }
      console.error('[POST /api/me/notes] upsert', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '메모 저장 실패',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const item = rowToNoteDto(data as Parameters<typeof rowToNoteDto>[0])
    const body: ApiResponse<{ item: NoteDTO }> = {
      success: true,
      data: { item },
    }
    return NextResponse.json(body, { status: 201 })
  } catch (err) {
    console.error('[POST /api/me/notes]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
