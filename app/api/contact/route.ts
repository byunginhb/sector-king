/**
 * POST /api/contact (anon + auth) — 문의/제보 제출
 * GET  /api/contact (admin only) — 목록 조회
 *
 * INSERT 시 user_id 는 로그인된 경우 auth.uid() 자동 매핑.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { getCurrentProfile } from '@/lib/auth/get-user'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_VALUES = ['inquiry', 'report', 'bug', 'feature', 'other'] as const
const STATUS_VALUES = ['open', 'replied', 'closed'] as const

const submitSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  email: z.string().email().max(320).optional(),
})

export async function POST(req: Request) {
  let parsed: z.infer<typeof submitSchema>
  try {
    const json = await req.json()
    const result = submitSchema.safeParse(json)
    if (!result.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: result.error.issues[0]?.message ?? '입력값이 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }
    parsed = result.data
  } catch {
    const body: ApiResponse<never> = {
      success: false,
      error: 'JSON 파싱 실패',
    }
    return NextResponse.json(body, { status: 400 })
  }

  const profile = await getCurrentProfile()
  const finalEmail = profile?.email ?? parsed.email
  if (!finalEmail) {
    const body: ApiResponse<never> = {
      success: false,
      error: '이메일은 필수입니다',
    }
    return NextResponse.json(body, { status: 400 })
  }

  // service_role 로 INSERT — anon RLS 정책도 통과하지만, 운영상 일관 단일 경로로.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contact_submissions')
    .insert({
      user_id: profile?.id ?? null,
      email: finalEmail,
      category: parsed.category,
      subject: parsed.subject,
      body: parsed.body,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[api.contact.POST]', error)
    const body: ApiResponse<never> = {
      success: false,
      error: '제출 실패',
    }
    return NextResponse.json(body, { status: 500 })
  }

  const body: ApiResponse<{ id: string }> = {
    success: true,
    data: { id: data.id },
  }
  return NextResponse.json(body, { status: 201 })
}

const listSchema = z.object({
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
  const parsed = listSchema.safeParse(Object.fromEntries(url.searchParams))
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
    console.error('[api.contact.GET]', error)
    const body: ApiResponse<never> = {
      success: false,
      error: '문의 목록 조회 실패',
    }
    return NextResponse.json(body, { status: 500 })
  }

  const body: ApiResponse<{
    rows: typeof data
    total: number
  }> = {
    success: true,
    data: { rows: data ?? [], total: count ?? 0 },
  }
  return NextResponse.json(body)
}
