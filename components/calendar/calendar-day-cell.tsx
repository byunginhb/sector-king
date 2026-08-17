'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { EventPill } from './event-pill'
import type { CalendarCell } from '@/lib/econ-calendar'
import type { EconomicEvent } from '@/types'

const MAX_VISIBLE = 2

interface CalendarDayCellProps {
  cell: CalendarCell
  events: EconomicEvent[]
  /** 로빙 tabindex: 활성 셀만 0, 나머지 -1 */
  isFocusable: boolean
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, dateKey: string) => void
  /** 숨은 일정까지 전부 보기(하루 상세 창 열기) */
  onOpenDay: (dateKey: string) => void
}

/**
 * 월 그리드 한 칸. role=gridcell + 로빙 tabindex(방향키 탐색 전용).
 * 셀 배경은 클릭하지 않는다 — 이벤트 항목(EventPill)이 출처 링크라 셀 전체를
 * 버튼으로 만들면 링크가 버튼 안에 중첩된다.
 *
 * 칸에는 2건까지만 그린다(실적 시즌 하루 35건이면 그 날에 맞춰 행 높이가
 * 늘어나 달력이 무너진다). 나머지는 "+N개 더" **버튼**으로 하루 상세 창을 연다
 * — 예전에는 비클릭 안내였고, 그 결과 숨은 일정을 볼 방법이 아예 없었다.
 * 키보드는 방향키로 칸을 옮긴 뒤 Enter/Space(상위 그리드가 처리).
 */
export const CalendarDayCell = forwardRef<HTMLDivElement, CalendarDayCellProps>(
  function CalendarDayCell({ cell, events, isFocusable, onKeyDown, onOpenDay }, ref) {
    const hidden = events.length - MAX_VISIBLE
    const hasEvents = events.length > 0

    return (
      <div
        ref={ref}
        role="gridcell"
        tabIndex={isFocusable ? 0 : -1}
        aria-current={cell.isToday ? 'date' : undefined}
        aria-label={`${cell.dayNum}일${hasEvents ? `, 일정 ${events.length}건` : ', 일정 없음'}`}
        onKeyDown={(e) => onKeyDown(e, cell.dateKey)}
        className={cn(
          'flex min-h-20 flex-col gap-0.5 rounded-md border border-border-subtle p-1 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          cell.isCurrentMonth ? 'bg-background' : 'bg-surface-1/40',
          cell.isToday && 'ring-1 ring-primary'
        )}
      >
        <span
          className={cn(
            'num-mono text-xs leading-none',
            cell.isToday
              ? 'font-semibold text-primary'
              : !cell.isCurrentMonth
                ? 'text-muted-foreground/50'
                : cell.isWeekend
                  ? 'text-muted-foreground'
                  : 'text-foreground/80'
          )}
        >
          {cell.dayNum}
        </span>

        <div className="flex flex-col gap-0.5 overflow-hidden">
          {events.slice(0, MAX_VISIBLE).map((e) => (
            <EventPill key={e.id} event={e} variant="grid" />
          ))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => onOpenDay(cell.dateKey)}
              // 로빙 tabindex 그리드라 Tab 순서에서 빼고, 키보드는 셀 Enter 로 연다.
              tabIndex={-1}
              aria-label={`${cell.dayNum}일 일정 ${events.length}건 전체 보기`}
              className="rounded-sm pl-1 text-left text-[10px] text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              +{hidden}개 더
            </button>
          )}
        </div>
      </div>
    )
  }
)
