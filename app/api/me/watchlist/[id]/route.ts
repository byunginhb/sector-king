/**
 * DELETE /api/me/watchlist/[id] — 워치리스트 단건 삭제 (RLS 가 본인 행만 허용)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
      const body: ApiResponse<never> = {
        success: false,
        error: '잘못된 id 입니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', guard.profile.id)

    if (error) {
      console.error('[DELETE /api/me/watchlist/[id]] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '삭제 실패',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const body: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[DELETE /api/me/watchlist/[id]]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
