/**
 * /me/watchlist — 워치리스트 관리 페이지
 */
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/require-admin'
import { WatchlistManager } from './watchlist-manager'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata: Metadata = {
  title: '내 워치리스트',
}

export default async function WatchlistPage() {
  await requireUser('/me/watchlist')

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="내 워치리스트" />

      <main className="container mx-auto px-4 py-8">
        <WatchlistManager />
      </main>
    </div>
  )
}
