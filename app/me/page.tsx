/**
 * /me — 내 페이지 메인 (PnL 요약 + 카운트 + 최근 활동)
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Star, NotebookPen, Clock } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-admin'
import { MyWatchlistCard } from '@/components/me/my-watchlist-card'
import { RecentlyViewedRow } from '@/components/me/recently-viewed-row'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata: Metadata = {
  title: '내 페이지',
  description: 'Sector King 내 워치리스트·메모·구독 요약',
}

export default async function MePage() {
  const profile = await requireUser('/me')

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle={`내 페이지 · ${profile.email}`} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section>
          <MyWatchlistCard />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            바로가기
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NavCard
              href="/me/watchlist"
              icon={<Star className="h-4 w-4 text-primary" aria-hidden />}
              title="워치리스트"
              desc="별표한 종목 관리"
            />
            <NavCard
              href="/me/notes"
              icon={
                <NotebookPen
                  className="h-4 w-4 text-primary"
                  aria-hidden
                />
              }
              title="메모"
              desc="저장한 분석 노트"
            />
            <NavCard
              href="/me/settings"
              icon={<Clock className="h-4 w-4 text-primary" aria-hidden />}
              title="설정"
              desc="이메일 구독·발송 시각"
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            최근 본 종목
          </h2>
          <RecentlyViewedRow />
        </section>
      </main>
    </div>
  )
}

function NavCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors p-4 flex items-center gap-3"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowRight
        className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  )
}
