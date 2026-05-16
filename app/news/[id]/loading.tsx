/**
 * /news/[id] 진입 직후 보여줄 스켈레톤.
 * 클라이언트 클릭 → 서버 컴포넌트 fetch 동안 즉각 피드백을 제공한다.
 */
import { Skeleton } from '@/components/ui/skeleton'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export default function NewsDetailLoading() {
  return (
    <div className="min-h-screen">
      <GlobalTopBar subtitle="마켓 리포트" />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <div className="pt-4 space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
