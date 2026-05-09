/**
 * /admin/news/[id]/edit — 편집 페이지.
 */
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { NewsEditor } from '@/components/news/admin/news-editor'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('news_reports')
    .select(NEWS_FULL_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()

  const report = rowToDto(data as Parameters<typeof rowToDto>[0])
  return <NewsEditor initial={report} />
}
