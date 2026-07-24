/**
 * /admin/contributors/[id]/edit — 인물 편집 페이지.
 * Server Component 에서 supabase 직접 조회 → ContributorEditor 에 initial 주입.
 */
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CONTRIBUTOR_COLUMNS, rowToDto } from '@/lib/contributors/dto'
import { ContributorEditor } from '@/components/contributors/admin/contributor-editor'

export const dynamic = 'force-dynamic'

export default async function EditContributorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('contributors')
    .select(CONTRIBUTOR_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  const dto = rowToDto(data as Parameters<typeof rowToDto>[0])
  return <ContributorEditor initial={dto} />
}
