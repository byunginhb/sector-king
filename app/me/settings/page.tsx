/**
 * /me/settings — 이메일 구독, 프로필 정보.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/require-admin'
import { EmailSubscriptionToggle } from '@/components/me/email-subscription-toggle'

export const metadata: Metadata = {
  title: '설정',
}

export default async function SettingsPage() {
  const profile = await requireUser('/me/settings')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/me"
              className="text-sm text-muted-foreground hover:text-foreground"
              aria-label="내 페이지로 돌아가기"
            >
              ← 내 페이지
            </Link>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              설정
            </h1>
          </div>
        </div>
      </header>

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
          <EmailSubscriptionToggle />
        </section>
      </main>
    </div>
  )
}
