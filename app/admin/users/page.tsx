/**
 * /admin/users — 가입 사용자 목록 + 구독 등급 부여/회수.
 *
 * - requireAdmin (Layer 2 게이트)
 * - service_role 클라이언트로 RLS 우회 (다른 admin 페이지와 동일 패턴)
 * - profiles + email_subscriptions.daily_report join 으로 메일 구독 여부 표시
 *
 * **실효 등급은 여기서 확정한다.** `resolveTier()` 는 만료를 읽기 시점에
 * 반영하는 순수 함수이고 게이트 판정도 같은 함수를 쓴다. 화면이 자기 규칙으로
 * 다시 계산하면 "목록엔 Pro 인데 실제로는 안 열리는" 어긋남이 생긴다.
 * 클라이언트 컴포넌트에는 계산 결과만 내려보낸다.
 */
import { AlertTriangle } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTier, type StorableTier } from '@/lib/permissions/tier'
import {
  UsersTable,
  UserStats,
  type AdminUserRow,
} from '@/components/admin/users/users-table'

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
  role: 'user' | 'admin'
  created_at: string
  subscription_tier: StorableTier | null
  subscription_expires_at: string | null
  subscription_source: string | null
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
      .select(
        'id, email, name, role, created_at, subscription_tier, subscription_expires_at, subscription_source',
        { count: 'exact' }
      )
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
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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

  const users: AdminUserRow[] = ((profiles ?? []) as ProfileRow[]).map((p) => {
    const sub = subMap.get(p.id)
    // 0014 적용 전 행이거나 백필 누락이면 free 로 접는다(fail-safe).
    const tier: StorableTier = p.subscription_tier ?? 'free'
    return {
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      createdAt: p.created_at,
      subscriptionTier: tier,
      subscriptionExpiresAt: p.subscription_expires_at,
      effectiveTier: resolveTier({
        role: p.role,
        subscriptionTier: tier,
        subscriptionExpiresAt: p.subscription_expires_at,
      }),
      subscriptionSource: p.subscription_source,
      subscribedToMail: sub?.daily_report === true,
      hourKst: sub?.hour_kst ?? null,
      lastSentAt: sub?.last_sent_at ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">사용자 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          가입자의 구독 등급을 부여·회수하고, 일별 마켓 리포트 메일 구독 여부를
          확인합니다. 등급 변경은 즉시 반영되며 변경 이력이 기록됩니다.
        </p>
      </div>

      <UserStats users={users} />

      {truncated ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            가입자가 {profilesCount?.toLocaleString()}명으로 표시 상한(
            {PAGE_LIMIT.toLocaleString()}행)을 초과했습니다. 통계와 목록은 최근{' '}
            {PAGE_LIMIT.toLocaleString()}명 기준입니다.
          </span>
        </div>
      ) : null}

      <UsersTable users={users} />
    </div>
  )
}
