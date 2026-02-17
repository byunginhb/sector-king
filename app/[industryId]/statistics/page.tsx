import { StatisticsPage } from '@/components/statistics/statistics-page'

export default async function StatisticsPageRoute({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params
  return <StatisticsPage industryId={industryId} />
}
