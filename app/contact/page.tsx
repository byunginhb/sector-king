/**
 * /contact — 문의/제보 페이지.
 *
 * - 누구나 접근 (비로그인 허용)
 * - 로그인 시 email 자동 (disabled), 비로그인 시 input
 */
import { MessageSquare } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { ContactForm } from '@/components/contact/contact-form'
import { getCurrentProfile } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '문의/제보 — Sector King',
  description: '서비스 관련 문의·제보·버그·기능 제안을 받습니다.',
}

export default async function ContactPage() {
  const profile = await getCurrentProfile()

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="문의 / 제보" />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Contact
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">문의 / 제보</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            서비스 관련 문의, 제보, 버그 신고, 기능 제안을 보내주세요. 영업일
            기준 2~3일 내에 답변 드립니다.
          </p>
        </div>

        <ContactForm
          defaultEmail={profile?.email ?? null}
          isAuthenticated={Boolean(profile)}
        />
      </main>
    </div>
  )
}
