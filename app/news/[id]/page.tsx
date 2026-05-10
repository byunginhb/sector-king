/**
 * /news/[id] — 발행된 마켓 리포트 상세 (Server Component)
 */
import Link from 'next/link'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { NewsDetailContent } from '@/components/news/news-detail-content'
import { getCurrentUser } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return { title: '마켓 리포트' }
  const supabase = await createClient()
  const { data } = await supabase
    .from('news_reports')
    .select('title, one_line_conclusion')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return { title: '마켓 리포트' }
  return {
    title: data.title,
    description: data.one_line_conclusion ?? undefined,
  }
}

export default async function NewsDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { view } = await searchParams

  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_FULL_COLUMNS)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) notFound()

  const report = rowToDto(data as Parameters<typeof rowToDto>[0])
  const initialView = view === 'expert' ? 'expert' : 'novice'
  const user = await getCurrentUser()
  const isLoggedIn = Boolean(user)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/news"
            aria-label="목록으로 돌아가기"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            목록
          </Link>
          <span className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
            <Newspaper className="h-4 w-4 text-primary shrink-0" aria-hidden />
            <span className="truncate">{report.title}</span>
          </div>
        </div>
      </header>
      <NewsDetailContent
        report={report}
        initialView={initialView}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
