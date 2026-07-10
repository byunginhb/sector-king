'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface CalendarSkeletonProps {
  view: 'week' | 'month'
}

/**
 * 로딩 스켈레톤. 월뷰=7열 그리드 형태 유지(레이아웃 시프트 방지),
 * 주뷰=날짜 그룹 리스트 형태.
 */
export function CalendarSkeleton({ view }: CalendarSkeletonProps) {
  if (view === 'month') {
    return (
      <div aria-busy="true" aria-label="경제 캘린더 불러오는 중">
        <div className="hidden lg:grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-5" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`c-${i}`} className="h-20" />
          ))}
        </div>
        <div className="lg:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="경제 캘린더 불러오는 중"
    >
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ))}
    </div>
  )
}
