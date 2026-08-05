'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { useAnalystDetail } from '@/hooks/use-analyst-detail'
import { AnalystDetailBody } from '@/components/analysts/analyst-detail-body'
import { pct, hitRateTone } from '@/components/analysts/ui'
import { cn } from '@/lib/utils'

/**
 * 애널리스트 상세 페이지 — 종목 리스트에서 애널리스트 클릭 시 진입.
 * 리더보드 미포함(표본 부족) 애널도 열람 가능하도록 인라인 아코디언이 아닌 전용 라우트.
 */
export default function AnalystDetailPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.id) ? params.id[0] : params.id
  const id = Number(raw)
  const valid = Number.isInteger(id) && id > 0
  const { data, isLoading, error } = useAnalystDetail(valid ? id : null)

  return (
    <div className="min-h-screen">
      <GlobalTopBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          뒤로
        </button>

        {!valid || error ? (
          <p className="text-center text-sm text-danger py-16">애널리스트를 찾을 수 없습니다.</p>
        ) : isLoading || !data ? (
          <div className="space-y-3">
            <div className="h-8 w-48 rounded bg-muted/40 animate-pulse" />
            <div className="h-64 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <>
            <header className="flex items-start gap-3 mb-4">
              <ClipboardCheck className="h-7 w-7 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {data.name}
                  <span className="ml-2 text-base font-normal text-muted-foreground">{data.firm}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  적중률 <span className={cn('font-semibold', hitRateTone(data.hitRate))}>{pct(data.hitRate)}</span>
                  <span className="text-muted-foreground/70"> · 채점 {data.scored}건 · 리포트 {data.reportCount}건 · 커버 {data.tickers.length}종목</span>
                </p>
              </div>
            </header>

            <AnalystDetailBody data={data} />
          </>
        )}
      </main>
    </div>
  )
}
