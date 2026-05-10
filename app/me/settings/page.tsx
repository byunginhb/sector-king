/**
 * /me/settings — 이메일 구독, 프로필 정보.
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/require-admin'
import { EmailSubscriptionSection } from '@/components/me/email-subscription-section'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '설정',
}

export default async function SettingsPage() {
  const profile = await requireUser('/me/settings')

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="설정" />

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            프로필
          </h2>
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">이름</dt>
                <dd className="text-foreground font-medium">
                  {profile.name ?? '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">이메일</dt>
                <dd className="text-foreground font-medium">{profile.email}</dd>
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
            이메일 구독
          </h2>
          <Suspense fallback={<div className="h-24 rounded-xl bg-surface-1 animate-pulse" />}>
            <EmailSubscriptionSection />
          </Suspense>
        </section>
      </main>
    </div>
  )
}
