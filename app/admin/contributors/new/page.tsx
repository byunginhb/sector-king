/**
 * /admin/contributors/new — 신규 인물 등록 페이지.
 * 표시 순서는 기존 최대값 + 1 로 자동 채운다.
 */
import { createClient } from '@/lib/supabase/server'
import { ContributorEditor } from '@/components/contributors/admin/contributor-editor'

export const dynamic = 'force-dynamic'

export default async function NewContributorPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contributors')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxSort = (data?.sort_order as number | undefined) ?? -1
  return <ContributorEditor initial={null} nextSortOrder={maxSort + 1} />
}
