import { PriceChangesPageContent } from '@/components/price-changes/price-changes-page-content'

export default async function PriceChangesPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  return <PriceChangesPageContent industryId={industryId} />
}
