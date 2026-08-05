import { Suspense } from 'react'
import { HegemonyMap } from '@/components/hegemony-map'

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industryId: string }>
}) {
  const { industryId } = await params

  return (
    <main className="min-h-screen">
      <Suspense fallback={null}>
        <HegemonyMap industryId={industryId} />
      </Suspense>
    </main>
  )
}
