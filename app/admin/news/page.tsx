/**
 * /admin/news — 관리자용 마켓 리포트 목록.
 */
import Link from 'next/link'
import { Plus, FileText, FilePen, Archive, FileCheck2, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { NEWS_LIST_COLUMNS, rowToListItem } from '@/lib/news/dto'
import { cn } from '@/lib/utils'
import type { ReportStatus } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<
  ReportStatus,
  { label: string; cls: string; Icon: typeof FilePen }
> = {
  draft: {
    label: '초안',
    cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
    Icon: FilePen,
  },
  published: {
    label: '발행',
    cls: 'border-success/30 bg-success/10 text-success',
    Icon: FileCheck2,
  },
  archived: {
    label: '보관',
    cls: 'border-border-subtle bg-surface-2 text-muted-foreground',
    Icon: Archive,
  },
}

export default async function AdminNewsListPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(50)

  const items = error
    ? []
    : (data ?? []).map((row) =>
        rowToListItem(row as Parameters<typeof rowToListItem>[0])
      )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            마켓 리포트 관리
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            일별 리포트 작성·발행
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden />
          신규 작성
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          목록을 불러올 수 없습니다: {error.message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            아직 작성된 리포트가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const meta = STATUS_META[it.status]
            const Icon = meta.Icon
            return (
              <li key={it.id}>
                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4 hover:border-primary/30 hover:bg-surface-2 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/news/${it.id}/edit`}
                      className="min-w-0 flex-1 group"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-bold uppercase rounded-md border px-2 py-0.5',
                            meta.cls
                          )}
                        >
                          <Icon className="h-3 w-3" aria-hidden />
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {it.reportDate}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-card-foreground mt-1.5 leading-tight group-hover:text-primary transition-colors">
                        {it.title}
                      </h3>
                      {it.oneLineConclusion && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {it.oneLineConclusion}
                        </p>
                      )}
                    </Link>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        수정: {format(new Date(it.updatedAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                      <Link
                        href={`/admin/news/${it.id}/preview-email`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 underline-offset-4 hover:underline"
                        aria-label="이메일 미리보기"
                      >
                        <Mail className="h-3 w-3" aria-hidden />
                        메일 미리보기
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
