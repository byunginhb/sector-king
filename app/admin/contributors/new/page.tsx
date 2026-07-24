/**
 * /admin/contributors/new — 신규 인물 등록 페이지.
 */
import { ContributorEditor } from '@/components/contributors/admin/contributor-editor'

export const dynamic = 'force-dynamic'

export default function NewContributorPage() {
  return <ContributorEditor initial={null} />
}
