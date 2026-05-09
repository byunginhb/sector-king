/**
 * 첫 로그인 시 산업/섹터 워치 추천 (선택).
 *
 * - 산업 6~8개 그리드 + "추가" 버튼.
 * - skip 가능.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'
import { useIndustries } from '@/hooks/use-industries'
import { useWatchlist } from '@/hooks/me/use-watchlist'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function OnboardingPickerStep({
  onComplete,
}: {
  onComplete?: () => void
}) {
  const router = useRouter()
  const { data, isLoading } = useIndustries({ region: 'all' })
  const { add, items } = useWatchlist({ itemType: 'industry' })
  const [submitting, setSubmitting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  const industries = data?.industries ?? []
  const watchedKeys = new Set(items.map((i) => i.itemKey))

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      for (const industryId of picked) {
        if (watchedKeys.has(industryId)) continue
        const target = industries.find((i) => i.id === industryId)
        await add({
          itemType: 'industry',
          itemKey: industryId,
          displayName: target?.name ?? industryId,
        }).catch((err) => {
          console.error('워치 추가 실패', err)
        })
      }
      onComplete?.()
      router.push('/')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkip() {
    onComplete?.()
    router.push('/')
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        관심있는 산업을 선택하면 메인 워치리스트에 자동으로 추가됩니다. 언제든
        해제할 수 있어요.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {industries.map((industry) => {
          const isPicked = picked.has(industry.id)
          const alreadyWatched = watchedKeys.has(industry.id)
          return (
            <button
              key={industry.id}
              type="button"
              disabled={alreadyWatched}
              aria-pressed={isPicked}
              onClick={() => toggle(industry.id)}
              className={cn(
                'group relative rounded-xl border p-4 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                alreadyWatched
                  ? 'border-border-subtle bg-surface-2 opacity-60 cursor-not-allowed'
                  : isPicked
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border-subtle bg-surface-1 hover:bg-surface-2'
              )}
            >
              {isPicked && (
                <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              )}
              <IndustryIcon
                iconKey={industry.id}
                className="h-5 w-5 text-muted-foreground mb-2"
              />
              <p className="text-sm font-semibold text-foreground">
                {industry.name}
              </p>
              {alreadyWatched && (
                <p className="text-[10px] text-amber-500 mt-1">이미 추가됨</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 text-sm rounded-lg border border-border-subtle hover:bg-surface-2"
        >
          건너뛰기
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || picked.size === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-semibold"
        >
          {submitting ? '추가 중...' : `${picked.size}개 추가하기`}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
