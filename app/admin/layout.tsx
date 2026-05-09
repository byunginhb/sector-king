import { requireAdmin } from '@/lib/auth/require-admin'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '관리자',
  description: 'Sector King 관리자 콘솔',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layer 2 — Server Component 게이트
  const profile = await requireAdmin('/admin')

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <header className="border-b border-border-subtle bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="메인으로 돌아가기"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">메인</span>
            </Link>
            <span className="h-4 w-px bg-border" aria-hidden />
            <h1 className="flex items-center gap-2 text-base font-semibold text-foreground truncate">
              <Shield className="h-4 w-4 text-amber-500" aria-hidden />
              Sector King · 관리자
            </h1>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {profile.email}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
