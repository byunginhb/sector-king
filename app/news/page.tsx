/**
 * /news — 발행된 마켓 리포트 목록 (Server Component)
 */
import Link from 'next/link'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { NEWS_LIST_COLUMNS, rowToListItem } from '@/lib/news/dto'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '마켓 리포트',
  description: '일별 마켓 리포트 목록',
}

export default async function NewsListPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_LIST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const items = error
    ? []
    : (data ?? []).map((row) =>
        rowToListItem(row as Parameters<typeof rowToListItem>[0])
      )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            aria-label="메인으로 돌아가기"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            메인
          </Link>
          <span className="h-4 w-px bg-border" aria-hidden />
          <h1 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground tracking-tight">
            <Newspaper className="h-5 w-5 text-primary" aria-hidden />
            마켓 리포트
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              아직 발행된 리포트가 없습니다.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/news/${it.id}`}
                  className="group block rounded-2xl border border-border-subtle bg-surface-1 p-5 transition-[border-color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-primary/40 hover:bg-surface-2 h-full"
                >
                  <p className="text-xs text-muted-foreground tabular-nums mb-1">
                    {it.publishedAt
                      ? format(new Date(it.publishedAt), 'yyyy-MM-dd')
                      : it.reportDate}
                  </p>
                  <h2 className="text-base font-bold text-card-foreground leading-tight tracking-tight group-hover:text-primary transition-colors mb-2">
                    {it.title}
                  </h2>
                  {it.oneLineConclusion && (
                    <p className="text-sm text-foreground/80 line-clamp-3">
                      {it.oneLineConclusion}
                    </p>
                  )}
                  {it.coverKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {it.coverKeywords.slice(0, 4).map((kw) => (
                        <span
                          key={kw}
                          className="text-[11px] text-muted-foreground rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
