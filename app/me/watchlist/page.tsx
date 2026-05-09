/**
 * /me/watchlist — 워치리스트 관리 페이지
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/require-admin'
import { WatchlistManager } from './watchlist-manager'

export const metadata: Metadata = {
  title: '내 워치리스트',
}

export default async function WatchlistPage() {
  await requireUser('/me/watchlist')

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
              내 워치리스트
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <WatchlistManager />
      </main>
    </div>
  )
}
