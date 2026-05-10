/**
 * /me/notes — 메모 목록.
 */
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/require-admin'
import { NoteList } from '@/components/me/note-list'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata: Metadata = {
  title: '내 메모',
}

export default async function NotesPage() {
  await requireUser('/me/notes')

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="내 메모" />

      <main className="container mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-4">
          종목/섹터/산업 상세 페이지에서 작성한 메모를 한눈에 확인하세요.
        </p>
        <NoteList />
      </main>
    </div>
  )
}
