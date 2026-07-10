'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  buildMonthCells,
  groupEventsByDate,
  monthLabel,
} from '@/lib/econ-calendar'
import { CalendarDayCell } from './calendar-day-cell'
import type { EconomicEvent } from '@/types'

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일'] as const

interface CalendarMonthGridProps {
  anchor: string
  todayKey: string
  events: EconomicEvent[]
  /** PageUp/PageDown 로 이전/다음 달 이동 */
  onShiftMonth: (dir: -1 | 1) => void
}

/** anchor 를 42셀 배열에서 항상 유효한 첫 초점 셀로 매핑. */
function initialFocusKey(cells: { dateKey: string; isCurrentMonth: boolean; isToday: boolean }[]): string {
  const today = cells.find((c) => c.isToday && c.isCurrentMonth)
  if (today) return today.dateKey
  const firstOfMonth = cells.find((c) => c.isCurrentMonth)
  return firstOfMonth?.dateKey ?? cells[0].dateKey
}

/**
 * 데스크탑 월 7열 그리드(월~일). role=grid + 로빙 tabindex + 방향키 탐색.
 * 모바일에선 부모가 리스트로 대체하므로 이 컴포넌트는 lg 이상에서만 마운트한다.
 */
export function CalendarMonthGrid({
  anchor,
  todayKey,
  events,
  onShiftMonth,
}: CalendarMonthGridProps) {
  const cells = useMemo(() => buildMonthCells(anchor, todayKey), [anchor, todayKey])
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events])

  const [focusKey, setFocusKey] = useState<string>(() => initialFocusKey(cells))
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const shouldFocusRef = useRef(false)

  // anchor(달) 변경 시 초점 셀 재설정
  useEffect(() => {
    setFocusKey(initialFocusKey(cells))
  }, [cells])

  // 키보드 이동 결과만 실제 DOM 포커스 이동(마운트 시 자동 포커스 방지)
  useEffect(() => {
    if (shouldFocusRef.current) {
      cellRefs.current[focusKey]?.focus()
      shouldFocusRef.current = false
    }
  }, [focusKey])

  const dateKeys = useMemo(() => cells.map((c) => c.dateKey), [cells])

  // 6주 × 7일 행 분할 (ARIA grid: gridcell 은 row 소유)
  const weeks = useMemo(() => {
    const rows: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [cells])

  const moveFocus = useCallback(
    (nextKey: string) => {
      if (!dateKeys.includes(nextKey)) return
      shouldFocusRef.current = true
      setFocusKey(nextKey)
    },
    [dateKeys]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, dateKey: string) => {
      const idx = dateKeys.indexOf(dateKey)
      if (idx < 0) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          moveFocus(dateKeys[idx - 1])
          break
        case 'ArrowRight':
          e.preventDefault()
          moveFocus(dateKeys[idx + 1])
          break
        case 'ArrowUp':
          e.preventDefault()
          moveFocus(dateKeys[idx - 7])
          break
        case 'ArrowDown':
          e.preventDefault()
          moveFocus(dateKeys[idx + 7])
          break
        case 'Home':
          e.preventDefault()
          moveFocus(dateKeys[idx - (idx % 7)])
          break
        case 'End':
          e.preventDefault()
          moveFocus(dateKeys[idx - (idx % 7) + 6])
          break
        case 'PageUp':
          e.preventDefault()
          onShiftMonth(-1)
          break
        case 'PageDown':
          e.preventDefault()
          onShiftMonth(1)
          break
        default:
          break
      }
    },
    [dateKeys, moveFocus, onShiftMonth]
  )

  return (
    <div role="grid" aria-label={`${monthLabel(anchor)} 경제 캘린더`}>
      <div role="row" className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map((w, i) => (
          <div
            key={w}
            role="columnheader"
            className={
              'py-1 text-center text-[11px] font-medium ' +
              (i >= 5 ? 'text-muted-foreground' : 'text-foreground/70')
            }
          >
            {w}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0].dateKey} role="row" className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <CalendarDayCell
                key={cell.dateKey}
                ref={(el) => {
                  cellRefs.current[cell.dateKey] = el
                }}
                cell={cell}
                events={eventsByDate[cell.dateKey] ?? []}
                isFocusable={cell.dateKey === focusKey}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
