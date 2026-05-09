/**
 * /admin/news/new — 신규 작성 페이지.
 */
import { NewsEditor } from '@/components/news/admin/news-editor'

export const dynamic = 'force-dynamic'

export default function NewNewsPage() {
  return <NewsEditor initial={null} />
}
