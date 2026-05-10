/**
 * /admin/email-log — 이메일 발송 로그 대시보드.
 *
 * - requireAdmin (Layer 2 게이트)
 * - 통계 (오늘 / 최근 7일) + 필터 + 테이블
 */
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmailLogStatsCards } from '@/components/admin/email-log/email-log-stats'
import { EmailLogFilterBar } from '@/components/admin/email-log/email-log-filter-bar'
import { EmailLogTable } from '@/components/admin/email-log/email-log-table'
import type {
  EmailLogRowDTO,
  EmailLogStats,
} from '@/app/api/admin/email-log/route'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '이메일 발송 로그 — 관리자',
  robots: { index: false, follow: false },
}

const STATUS_VALUES = ['sent', 'failed', 'skipped', 'bounced'] as const
type EmailLogStatus = (typeof STATUS_VALUES)[number]
const PAGE_LIMIT = 50

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminEmailLogPage({ searchParams }: PageProps) {
  await requireAdmin('/admin/email-log')

  const sp = await searchParams
  const statusParam = pickString(sp.status)
  const kindParam = pickString(sp.kind)
  const fromParam = pickString(sp.from)
  const toParam = pickString(sp.to)
  const offset = Math.max(Number(pickString(sp.offset) ?? '0') || 0, 0)

  const statusFilter = (statusParam ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is EmailLogStatus =>
      (STATUS_VALUES as readonly string[]).includes(s)
    )

  const admin = createAdminClient()

  let query = admin
    .from('email_log')
    .select(
      'id, user_id, kind, subject, sent_at, status, error, profiles(email, name)',
      { count: 'exact' }
    )
    .order('sent_at', { ascending: false })
    .range(offset, offset + PAGE_LIMIT - 1)

  if (statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }
  if (kindParam) {
    query = query.eq('kind', kindParam)
  }
  if (fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)) {
    query = query.gte('sent_at', `${fromParam}T00:00:00.000Z`)
  }
  if (toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
    const d = new Date(`${toParam}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    query = query.lt('sent_at', d.toISOString())
  }

  const [{ data: rowsData, count }, stats] = await Promise.all([
    query,
    fetchStats(admin),
  ])

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

  const rows: EmailLogRowDTO[] = ((rowsData ?? []) as RowShape[]).map((r) => {
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

  const tableSearchParams = {
    status: statusParam,
    kind: kindParam,
    from: fromParam,
    to: toParam,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">이메일 발송 로그</h2>
        <p className="text-sm text-muted-foreground mt-1">
          일별 마켓 리포트 발송 이력과 통계를 확인합니다.
        </p>
      </div>

      <EmailLogStatsCards stats={stats} />
      <EmailLogFilterBar />

      <EmailLogTable
        rows={rows}
        total={count ?? rows.length}
        limit={PAGE_LIMIT}
        offset={offset}
        searchParams={tableSearchParams}
      />
    </div>
  )
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
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
    admin.from('email_log').select('status').gte('sent_at', todayStart.toISOString()),
    admin.from('email_log').select('status').gte('sent_at', sevenDaysAgo.toISOString()),
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
    return Math.round((t.sent / denom) * 1000) / 10
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
