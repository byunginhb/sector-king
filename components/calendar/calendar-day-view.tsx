'use client'

import { useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventPill } from './event-pill'
import { CalendarEmpty } from './calendar-empty'
import {
  addDays,
  formatDayLabel,
  relativeDayLabel,
  swipeDelta,
} from '@/lib/econ-calendar'
import type { EconomicEvent } from '@/types'

interface CalendarDayViewProps {
  /** 표시 중인 날짜 'YYYY-MM-DD' */
  dateKey: string
  todayKey: string
  /** dateKey 하루치 이벤트(정렬은 API 순서 유지) */
  events: EconomicEvent[]
  onDateChange: (dateKey: string) => void
  /** 국가/카테고리 필터가 걸려 있는지(빈 상태 보조 안내) */
  filtered?: boolean
}

/**
 * 모바일 전용 하루 보기. 주/월 리스트는 날짜를 전부 세로로 쌓아 스캔이 어려워
 * 선택한 하루만 보여준다(부모가 lg 미만에서만 마운트).
 *
 * 날짜 이동 3경로: 좌우 스와이프 / 화살표 버튼 / 네이티브 date 입력(라벨 위 투명 오버레이).
 * 스와이프는 preventDefault 하지 않고 세로 이동이 크면 무시하므로 페이지 스크롤과 공존한다.
 */
export function CalendarDayView({
  dateKey,
  todayKey,
  events,
  onDateChange,
  filtered,
}: CalendarDayViewProps) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const rel = relativeDayLabel(dateKey, todayKey)

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const s = start.current
    start.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dir = swipeDelta(t.clientX - s.x, t.clientY - s.y)
    if (dir !== 0) onDateChange(addDays(dateKey, dir))
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDateChange(addDays(dateKey, -1))}
          aria-label="이전 날짜"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle text-foreground/70 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        {/* 라벨 위에 투명 date 입력을 덮어 탭하면 네이티브 날짜 선택기가 열린다 */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5">
          {rel && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                rel === '오늘'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-2 text-foreground/80'
              )}
            >
              {rel}
            </span>
          )}
          <span className="truncate text-sm font-medium text-foreground" aria-live="polite">
            {formatDayLabel(dateKey)}
          </span>
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="date"
            value={dateKey}
            onChange={(e) => {
              if (e.target.value) onDateChange(e.target.value)
            }}
            aria-label="날짜 선택"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <button
          type="button"
          onClick={() => onDateChange(addDays(dateKey, 1))}
          aria-label="다음 날짜"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-subtle text-foreground/70 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {events.length === 0 ? (
        <CalendarEmpty filtered={filtered} title="이 날 예정된 일정이 없습니다" />
      ) : (
        <ul className="mt-3 space-y-1.5">
          {events.map((e) => (
            <li key={e.id}>
              <EventPill event={e} variant="list" />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        좌우로 밀어 날짜를 옮기거나 날짜를 눌러 선택하세요
      </p>
    </div>
  )
}
