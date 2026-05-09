/**
 * /me/notes — 메모 목록.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/require-admin'
import { NoteList } from '@/components/me/note-list'

export const metadata: Metadata = {
  title: '내 메모',
}

export default async function NotesPage() {
  await requireUser('/me/notes')

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
              내 메모
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-4">
          종목/섹터/산업 상세 페이지에서 작성한 메모를 한눈에 확인하세요.
        </p>
        <NoteList />
      </main>
    </div>
  )
}
