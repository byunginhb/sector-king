/**
 * GET /api/admin/contact — 관리자 전용 문의 목록.
 *
 * Query: status, category, limit, offset
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_VALUES = ['open', 'replied', 'closed'] as const
const CATEGORY_VALUES = ['inquiry', 'report', 'bug', 'feature', 'other'] as const

const querySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(Number(v) || 50, 1), 200) : 50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(Number(v) || 0, 0) : 0)),
})

export async function GET(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      success: false,
      error: parsed.error.issues[0]?.message ?? '쿼리 파라미터 오류',
    }
    return NextResponse.json(body, { status: 400 })
  }
  const { status, category, limit, offset } = parsed.data

  const supabase = await createClient()
  let query = supabase
    .from('contact_submissions')
    .select(
      'id, user_id, email, category, subject, body, status, admin_note, created_at, updated_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    query = query.eq('status', status)
  }
  if (category && (CATEGORY_VALUES as readonly string[]).includes(category)) {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[api.admin.contact.GET]', error)
    const body: ApiResponse<never> = {
      success: false,
      error: '문의 목록 조회 실패',
    }
    return NextResponse.json(body, { status: 500 })
  }

  const body: ApiResponse<{ rows: typeof data; total: number }> = {
    success: true,
    data: { rows: data ?? [], total: count ?? 0 },
  }
  return NextResponse.json(body)
}
