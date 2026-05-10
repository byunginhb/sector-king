/**
 * GET /api/admin/email-log
 *
 * 관리자 전용 — email_log 조회 + 일별 통계.
 *
 * Query params:
 *   - status: 'sent' | 'failed' | 'skipped' | 'bounced' (콤마 구분 다중 허용)
 *   - kind: 'daily_news' | 'test_daily_news' (단수 또는 콤마 구분)
 *   - from: YYYY-MM-DD (sent_at >= from 00:00:00 UTC)
 *   - to: YYYY-MM-DD (sent_at < to+1 00:00:00 UTC)
 *   - limit: default 50 (max 200)
 *   - offset: default 0
 *   - stats: '1' 이면 데이터 + stats 동시 반환
 *
 * 응답:
 *   { success, data: { rows, total, stats? } }
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_VALUES = ['sent', 'failed', 'skipped', 'bounced'] as const
type EmailLogStatus = (typeof STATUS_VALUES)[number]

const querySchema = z.object({
  status: z.string().optional(),
  kind: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(Number(v) || 50, 1), 200) : 50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(Number(v) || 0, 0) : 0)),
  stats: z.string().optional(),
})

export interface EmailLogRowDTO {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  kind: string
  subject: string
  sentAt: string
  status: EmailLogStatus
  error: string | null
}

export interface EmailLogStats {
  todayTotal: number
  todaySent: number
  todayFailed: number
  todaySkipped: number
  todayBounced: number
  todaySuccessRate: number | null
  last7Total: number
  last7Sent: number
  last7Failed: number
  last7Skipped: number
  last7Bounced: number
  last7SuccessRate: number | null
}

export interface EmailLogResponse {
  rows: EmailLogRowDTO[]
  total: number
  stats?: EmailLogStats
}

function parseList(input?: string): string[] | null {
  if (!input) return null
  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length === 0 ? null : parts
}

function isoDateStart(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return `${s}T00:00:00.000Z`
}

function isoDateEndExclusive(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

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

  const { status, kind, from, to, limit, offset, stats } = parsed.data
  const statusFilter = parseList(status)?.filter((s): s is EmailLogStatus =>
    (STATUS_VALUES as readonly string[]).includes(s)
  ) ?? null
  const kindFilter = parseList(kind)
  const fromIso = from ? isoDateStart(from) : null
  const toIso = to ? isoDateEndExclusive(to) : null

  const admin = createAdminClient()

  let query = admin
    .from('email_log')
    .select(
      'id, user_id, kind, subject, sent_at, status, error, profiles(email, name)',
      { count: 'exact' }
    )
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }
  if (kindFilter && kindFilter.length > 0) {
    query = query.in('kind', kindFilter)
  }
  if (fromIso) query = query.gte('sent_at', fromIso)
  if (toIso) query = query.lt('sent_at', toIso)

  const { data, error, count } = await query
  if (error) {
    console.error('[admin.email-log] query', error)
    const body: ApiResponse<never> = {
      success: false,
      error: '이메일 로그 조회 실패',
    }
    return NextResponse.json(body, { status: 500 })
  }

  type RowShape = {
    id: string
    user_id: string
    kind: string
    subject: string
    sent_at: string
    status: EmailLogStatus
    error: string | null
    profiles:
      | { email: string | null; name: string | null }
      | { email: string | null; name: string | null }[]
      | null
  }

  const rows: EmailLogRowDTO[] = ((data ?? []) as RowShape[]).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return {
      id: r.id,
      userId: r.user_id,
      userEmail: profile?.email ?? null,
      userName: profile?.name ?? null,
      kind: r.kind,
      subject: r.subject,
      sentAt: r.sent_at,
      status: r.status,
      error: r.error,
    }
  })

  let statsResult: EmailLogStats | undefined
  if (stats === '1') {
    statsResult = await fetchStats(admin)
  }

  const body: ApiResponse<EmailLogResponse> = {
    success: true,
    data: {
      rows,
      total: count ?? rows.length,
      stats: statsResult,
    },
  }
  return NextResponse.json(body)
}

async function fetchStats(
  admin: ReturnType<typeof createAdminClient>
): Promise<EmailLogStats> {
  const now = new Date()
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

  const [todayRes, last7Res] = await Promise.all([
    admin
      .from('email_log')
      .select('status', { count: 'exact', head: false })
      .gte('sent_at', todayStart.toISOString()),
    admin
      .from('email_log')
      .select('status', { count: 'exact', head: false })
      .gte('sent_at', sevenDaysAgo.toISOString()),
  ])

  function tally(rows: { status: EmailLogStatus }[] | null) {
    const t = { sent: 0, failed: 0, skipped: 0, bounced: 0, total: 0 }
    for (const r of rows ?? []) {
      t.total += 1
      if (r.status === 'sent') t.sent += 1
      else if (r.status === 'failed') t.failed += 1
      else if (r.status === 'skipped') t.skipped += 1
      else if (r.status === 'bounced') t.bounced += 1
    }
    return t
  }

  const todayT = tally(todayRes.data as { status: EmailLogStatus }[] | null)
  const last7T = tally(last7Res.data as { status: EmailLogStatus }[] | null)

  function rate(t: ReturnType<typeof tally>): number | null {
    const denom = t.sent + t.failed
    if (denom === 0) return null
    return Math.round((t.sent / denom) * 1000) / 10 // %, 0.1 단위
  }

  return {
    todayTotal: todayT.total,
    todaySent: todayT.sent,
    todayFailed: todayT.failed,
    todaySkipped: todayT.skipped,
    todayBounced: todayT.bounced,
    todaySuccessRate: rate(todayT),
    last7Total: last7T.total,
    last7Sent: last7T.sent,
    last7Failed: last7T.failed,
    last7Skipped: last7T.skipped,
    last7Bounced: last7T.bounced,
    last7SuccessRate: rate(last7T),
  }
}
