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
  onSelect: (dateKey: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, dateKey: string) => void
}

/**
 * 월 그리드 한 칸. role=gridcell + 로빙 tabindex.
 * 오늘 강조(ring + aria-current), 이벤트 최대 2 + "+N개 더보기".
 */
export const CalendarDayCell = forwardRef<HTMLDivElement, CalendarDayCellProps>(
  function CalendarDayCell({ cell, events, isFocusable, onSelect, onKeyDown }, ref) {
    const hidden = events.length - MAX_VISIBLE
    const hasEvents = events.length > 0

    return (
      <div
        ref={ref}
        role="gridcell"
        tabIndex={isFocusable ? 0 : -1}
        aria-current={cell.isToday ? 'date' : undefined}
        aria-label={`${cell.dayNum}일${hasEvents ? `, 일정 ${events.length}건` : ', 일정 없음'}`}
        onClick={() => onSelect(cell.dateKey)}
        onKeyDown={(e) => onKeyDown(e, cell.dateKey)}
        className={cn(
          'flex min-h-20 cursor-pointer flex-col gap-0.5 rounded-md border border-border-subtle p-1 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          cell.isCurrentMonth ? 'bg-background' : 'bg-surface-1/40',
          hasEvents && 'hover:bg-muted/40',
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
            <span className="pl-1 text-[10px] text-muted-foreground">
              +{hidden}개 더보기
            </span>
          )}
        </div>
      </div>
    )
  }
)
