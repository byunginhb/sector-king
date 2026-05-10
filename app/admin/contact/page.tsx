/**
 * /admin/contact — 문의/제보 관리자 목록.
 *
 * - open 우선 (status=open 필터로 강조)
 * - 상태/카테고리 필터 (URL 쿼리)
 */
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import {
  ContactList,
  type ContactListItem,
} from '@/components/admin/contact/contact-list'
import type {
  ContactStatus,
  ContactCategory,
} from '@/drizzle/supabase-schema'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '문의/제보 관리 — 관리자',
  robots: { index: false, follow: false },
}

const STATUS_TABS: { value: ContactStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변' },
  { value: 'closed', label: '종료' },
]

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminContactListPage({ searchParams }: PageProps) {
  await requireAdmin('/admin/contact')

  const sp = await searchParams
  const statusParam = pickString(sp.status) ?? 'open'

  const supabase = await createClient()
  let query = supabase
    .from('contact_submissions')
    .select(
      'id, email, category, subject, status, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusParam !== 'all' && isStatus(statusParam)) {
    query = query.eq('status', statusParam)
  }

  const { data, error } = await query

  type Row = {
    id: string
    email: string
    category: ContactCategory
    subject: string
    status: ContactStatus
    created_at: string
  }

  const items: ContactListItem[] = error
    ? []
    : ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        email: r.email,
        category: r.category,
        subject: r.subject,
        status: r.status,
        createdAt: r.created_at,
      }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">문의 / 제보 관리</h2>
        <p className="text-sm text-muted-foreground mt-1">
          사용자가 보낸 문의·제보 목록입니다. 클릭하여 답변할 수 있습니다.
        </p>
      </div>

      <div role="group" className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map((t) => {
          const active = statusParam === t.value
          return (
            <Link
              key={t.value}
              href={t.value === 'all' ? '/admin/contact?status=all' : `/admin/contact?status=${t.value}`}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border-subtle bg-surface-2 text-muted-foreground hover:bg-surface-3'
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      <ContactList items={items} />
    </div>
  )
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

function isStatus(s: string): s is ContactStatus {
  return s === 'open' || s === 'replied' || s === 'closed'
}
