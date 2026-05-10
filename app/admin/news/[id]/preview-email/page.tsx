/**
 * /admin/news/[id]/preview-email — 이메일 미리보기 + 테스트 발송.
 *
 * 좌: iframe 으로 렌더된 HTML
 * 우: 테스트 발송 폼 (수신자 이메일 + 발송 버튼)
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { isResendConfigured } from '@/lib/email/resend'
import { PreviewEmailClient } from '@/components/admin/news/preview-email-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PreviewEmailPage({ params }: PageProps) {
  const profile = await requireAdmin('/admin')
  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_FULL_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> 목록으로
        </Link>
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
          리포트를 찾을 수 없습니다
        </div>
      </div>
    )
  }

  const report = rowToDto(data as Parameters<typeof rowToDto>[0])
  const resendConfigured = isResendConfigured()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            href="/admin/news"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> 목록으로
          </Link>
          <h2 className="text-xl font-bold text-foreground mt-1 leading-tight">
            메일 미리보기 — {report.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {report.reportDate} · {report.status}
          </p>
        </div>
        <Link
          href={`/admin/news/${report.id}/edit`}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          편집으로 돌아가기
        </Link>
      </div>

      <PreviewEmailClient
        reportId={report.id}
        adminEmail={profile.email}
        resendConfigured={resendConfigured}
      />
    </div>
  )
}
