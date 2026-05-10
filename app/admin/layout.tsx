import { requireAdmin } from '@/lib/auth/require-admin'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

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
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle={`관리자 · ${profile.email}`} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
