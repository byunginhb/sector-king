/**
 * /admin/contact/[id] — 문의 상세 + 답변 폼.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { ContactDetailForm } from '@/components/admin/contact/contact-detail-form'
import type {
  ContactStatus,
  ContactCategory,
} from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '문의 상세 — 관리자',
  robots: { index: false, follow: false },
}

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  inquiry: '일반 문의',
  report: '제보',
  bug: '버그',
  feature: '기능 제안',
  other: '기타',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminContactDetailPage({ params }: PageProps) {
  await requireAdmin('/admin/contact')
  const { id } = await params

  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_submissions')
    .select(
      'id, user_id, email, category, subject, body, status, admin_note, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()

  const row = data as {
    id: string
    user_id: string | null
    email: string
    category: ContactCategory
    subject: string
    body: string
    status: ContactStatus
    admin_note: string | null
    created_at: string
    updated_at: string
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/admin/contact"
          aria-label="목록으로 돌아가기"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          목록
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          {row.subject}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {CATEGORY_LABEL[row.category]} · {row.email} ·{' '}
          {format(new Date(row.created_at), 'yyyy-MM-dd HH:mm')}
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          문의 본문
        </p>
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {row.body}
        </div>
      </div>

      <ContactDetailForm
        id={row.id}
        initialStatus={row.status}
        initialNote={row.admin_note ?? ''}
        recipientEmail={row.email}
      />
    </div>
  )
}
