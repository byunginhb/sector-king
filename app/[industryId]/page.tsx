import { HegemonyMap } from '@/components/hegemony-map'

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params

  return (
    <main className="min-h-screen bg-background">
      <HegemonyMap industryId={industryId} />
    </main>
  )
}
