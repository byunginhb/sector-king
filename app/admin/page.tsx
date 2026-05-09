import Link from 'next/link'
import { Newspaper, FileCheck2, FilePen, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('news_reports')
    .select('id, title, status, published_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)

  const items = rows ?? []
  const publishedCount = items.filter((r) => r.status === 'published').length
  const draftCount = items.filter((r) => r.status === 'draft').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">대시보드</h2>
        <p className="text-sm text-muted-foreground mt-1">
          관리자 콘솔에 오신 것을 환영합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Newspaper className="h-5 w-5 text-primary" aria-hidden />}
          label="최근 5건"
          value={items.length}
        />
        <StatCard
          icon={<FileCheck2 className="h-5 w-5 text-success" aria-hidden />}
          label="발행 (최근 5건 중)"
          value={publishedCount}
        />
        <StatCard
          icon={<FilePen className="h-5 w-5 text-muted-foreground" aria-hidden />}
          label="초안 (최근 5건 중)"
          value={draftCount}
        />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" aria-hidden />
            최근 리포트
          </h3>
          <Link
            href="/admin/news"
            className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
          >
            전체 보기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 작성된 리포트가 없습니다.{' '}
            <Link
              href="/admin/news/new"
              className="text-primary font-medium hover:underline"
            >
              신규 작성
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle -mx-2">
            {items.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/admin/news/${it.id}/edit`}
                  className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-surface-2 rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {it.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {it.status} · {format(new Date(it.updated_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
