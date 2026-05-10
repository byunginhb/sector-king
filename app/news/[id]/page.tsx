/**
 * /news/[id] — 발행된 마켓 리포트 상세 (Server Component)
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { NewsDetailContent } from '@/components/news/news-detail-content'
import { getCurrentUser } from '@/lib/auth/get-user'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

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
      <GlobalTopBar
        subtitle={report.title}
        mobileLeading={
          <Link
            href="/news"
            aria-label="목록으로 돌아가기"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border-subtle bg-surface-1 text-foreground hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        }
        extraActions={
          <Link
            href="/news"
            aria-label="목록으로 돌아가기"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            목록
          </Link>
        }
      />
      <NewsDetailContent
        report={report}
        initialView={initialView}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
