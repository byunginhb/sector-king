'use client'

import { CalendarX } from 'lucide-react'

interface CalendarEmptyProps {
  /** 국가/카테고리 필터가 걸려 있으면 '필터를 전체로' 보조 안내 노출 */
  filtered?: boolean
}

/** 해당 기간/필터에 이벤트가 없을 때. */
export function CalendarEmpty({ filtered = false }: CalendarEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <CalendarX className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-foreground/80">
        이 기간에 예정된 경제지표가 없습니다
      </p>
      {filtered && (
        <p className="text-xs text-muted-foreground">
          필터를 전체로 바꿔 더 많은 일정을 확인해 보세요
        </p>
      )}
    </div>
  )
}
