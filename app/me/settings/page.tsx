/**
 * /me/settings — 프로필, 로그인 수단, 이메일 구독.
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/require-admin'
import { EmailSubscriptionSection } from '@/components/me/email-subscription-section'
import { LinkedAccountsSection } from '@/components/me/linked-accounts-section'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getEnabledAuthProviders } from '@/lib/auth/enabled-providers'
import { buildLinkedAccountsView } from '@/lib/auth/linked-accounts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '설정',
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const profile = await requireUser('/me/settings')

  // 연결 흐름의 실패는 `/auth/callback` 이 여기로 되돌려 보낸다.
  const linkError = errorMessageFor((await searchParams).error)
  const [user, providers] = await Promise.all([
    getCurrentUser(),
    getEnabledAuthProviders(),
  ])
  const accountsView = buildLinkedAccountsView(user?.identities, providers)

  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="설정" />

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            프로필
          </h2>
          <div className="sk-card p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">이름</dt>
                <dd className="text-foreground font-medium">
                  {profile.name ?? '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">이메일</dt>
                <dd className="text-foreground font-medium">
                  {profile.email ?? '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">역할</dt>
                <dd className="text-foreground font-medium">
                  {profile.role === 'admin' ? '관리자' : '일반'}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            로그인 수단
          </h2>
          {linkError && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {linkError}
            </div>
          )}
          <LinkedAccountsSection view={accountsView} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            이메일 구독
          </h2>
          <Suspense fallback={<div className="h-24 rounded-md bg-surface-1 animate-pulse" />}>
            <EmailSubscriptionSection />
          </Suspense>
        </section>
      </main>
    </div>
  )
}

function errorMessageFor(code: string | undefined): string | null {
  switch (code) {
    case 'identity_taken':
      return '이미 다른 Sector King 계정에 연결된 로그인 수단입니다. 그 계정으로 로그인한 뒤 해제하거나, 다른 계정으로 시도해 주세요.'
    case 'oauth_failed':
      return '연결에 실패했습니다. 다시 시도해 주세요.'
    default:
      return null
  }
}
