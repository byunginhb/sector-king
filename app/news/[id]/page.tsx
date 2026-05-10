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
import { NewsArticleJsonLd, BreadcrumbJsonLd } from '@/components/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

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
    .select('title, one_line_conclusion, cover_keywords, published_at, report_date')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return { title: '마켓 리포트' }

  const url = `${BASE_URL}/news/${id}`
  const description =
    data.one_line_conclusion ??
    `${data.title} — Sector King 일별 마켓 리포트 (${data.report_date})`

  return {
    title: data.title,
    description,
    keywords: data.cover_keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: data.title,
      description,
      publishedTime: data.published_at ?? undefined,
      authors: ['Sector King'],
      tags: data.cover_keywords ?? undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description,
    },
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

  const description =
    report.oneLineConclusion ??
    `${report.title} — Sector King 일별 마켓 리포트 (${report.reportDate})`

  return (
    <div className="min-h-screen">
      <NewsArticleJsonLd
        id={report.id}
        title={report.title}
        description={description}
        publishedAt={report.publishedAt}
        reportDate={report.reportDate}
        modifiedAt={report.updatedAt ?? null}
        keywords={report.coverKeywords}
      />
      <BreadcrumbJsonLd
        items={[
          { name: '홈', url: BASE_URL },
          { name: '마켓 리포트', url: `${BASE_URL}/news` },
          { name: report.title, url: `${BASE_URL}/news/${report.id}` },
        ]}
      />
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
