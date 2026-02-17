import { MoneyFlowPageContent } from '@/components/money-flow/money-flow-page-content'

export default async function MoneyFlowPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  return <MoneyFlowPageContent industryId={industryId} />
}
