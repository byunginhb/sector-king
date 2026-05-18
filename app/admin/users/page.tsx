/**
 * /admin/users — 가입 사용자 목록.
 *
 * - requireAdmin (Layer 2 게이트)
 * - profiles 전체 + email_subscriptions.daily_report join 으로 메일 구독 여부 표시
 * - service_role 클라이언트로 RLS 우회 (다른 admin 페이지와 동일 패턴)
 */
import { format } from 'date-fns'
import {
  Check,
  Mail,
  User as UserIcon,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_LIMIT = 5000

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '사용자 관리 — 관리자',
  robots: { index: false, follow: false },
}

interface ProfileRow {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

interface SubRow {
  user_id: string
  daily_report: boolean
  hour_kst: number
  last_sent_at: string | null
}

export default async function AdminUsersPage() {
  await requireAdmin('/admin/users')

  const admin = createAdminClient()

  const [
    { data: profiles, error: profilesErr, count: profilesCount },
    { data: subs, error: subsErr },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, name, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PAGE_LIMIT - 1),
    admin
      .from('email_subscriptions')
      .select('user_id, daily_report, hour_kst, last_sent_at')
      .range(0, PAGE_LIMIT - 1),
  ])

  if (profilesErr || subsErr) {
    console.error('[admin/users] supabase', profilesErr ?? subsErr)
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">사용자 관리</h2>
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
        </div>
      </div>
    )
  }

  const truncated =
    typeof profilesCount === 'number' && profilesCount > (profiles?.length ?? 0)

  const subMap = new Map<string, SubRow>()
  for (const row of (subs ?? []) as SubRow[]) {
    subMap.set(row.user_id, row)
  }

  const items = ((profiles ?? []) as ProfileRow[]).map((p) => {
    const sub = subMap.get(p.id)
    return {
      ...p,
      subscribed: sub?.daily_report === true,
      hourKst: sub?.hour_kst ?? null,
      lastSentAt: sub?.last_sent_at ?? null,
    }
  })

  const totalUsers = items.length
  const subscriberCount = items.filter((u) => u.subscribed).length
  const adminCount = items.filter((u) => u.role === 'admin').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">사용자 관리</h2>
        <p className="text-sm text-muted-foreground mt-1">
          가입한 사용자 목록과 일별 마켓 리포트 메일 구독 여부를 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<UserIcon className="h-5 w-5 text-primary" aria-hidden />}
          label="전체 가입자"
          value={totalUsers}
        />
        <StatCard
          icon={<Mail className="h-5 w-5 text-success" aria-hidden />}
          label="메일 구독자"
          value={subscriberCount}
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-muted-foreground" aria-hidden />}
          label="관리자"
          value={adminCount}
        />
      </div>

      {truncated ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            가입자가 {profilesCount?.toLocaleString()}명으로 표시 상한
            {' '}({PAGE_LIMIT.toLocaleString()}행)을 초과했습니다. 통계와 목록은
            최근 {PAGE_LIMIT.toLocaleString()}명 기준입니다.
          </span>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium text-center">메일 구독</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">최근 발송</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    가입한 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {u.name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Shield className="h-3 w-3" aria-hidden />
                          admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">user</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.subscribed ? (
                        <span
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success/15 text-success"
                          title={
                            u.hourKst !== null ? `매일 ${u.hourKst}시 KST` : '구독 중'
                          }
                          aria-label="메일 구독 중"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground" aria-label="미구독">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {format(new Date(u.created_at), 'yyyy-MM-dd')}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {u.lastSentAt
                        ? format(new Date(u.lastSentAt), 'yyyy-MM-dd HH:mm')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
