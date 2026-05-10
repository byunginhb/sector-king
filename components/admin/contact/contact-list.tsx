/**
 * 관리자 문의 목록 — open 우선 정렬.
 */
import Link from 'next/link'
import { format } from 'date-fns'
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactStatus, ContactCategory } from '@/drizzle/supabase-schema'

export interface ContactListItem {
  id: string
  email: string
  category: ContactCategory
  subject: string
  status: ContactStatus
  createdAt: string
}

const STATUS_META: Record<
  ContactStatus,
  { label: string; cls: string; Icon: typeof CircleAlert }
> = {
  open: {
    label: '대기',
    cls: 'border-warning/30 bg-warning/10 text-warning',
    Icon: CircleAlert,
  },
  replied: {
    label: '답변',
    cls: 'border-success/30 bg-success/10 text-success',
    Icon: CircleCheck,
  },
  closed: {
    label: '종료',
    cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
    Icon: CircleDashed,
  },
}

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  inquiry: '일반 문의',
  report: '제보',
  bug: '버그',
  feature: '기능 제안',
  other: '기타',
}

export function ContactList({ items }: { items: ContactListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
        <p className="text-sm text-muted-foreground">문의가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1">
      <ul className="divide-y divide-border-subtle">
        {items.map((it) => {
          const meta = STATUS_META[it.status]
          const StatusIcon = meta.Icon
          return (
            <li key={it.id}>
              <Link
                href={`/admin/contact/${it.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0',
                    meta.cls
                  )}
                >
                  <StatusIcon className="h-3 w-3" aria-hidden />
                  {meta.label}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {CATEGORY_LABEL[it.category]}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">
                    {it.subject}
                  </span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {it.email} · {format(new Date(it.createdAt), 'yyyy-MM-dd HH:mm')}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
