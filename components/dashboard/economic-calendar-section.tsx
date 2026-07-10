'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import { useEconomicCalendar } from '@/hooks/use-economic-calendar'
import {
  getCalendarRange,
  buildDateGroups,
  groupEventsByDate,
  shiftAnchor,
  monthLabel,
  weekRangeLabel,
  kstToday,
} from '@/lib/econ-calendar'
import { CalendarFilters } from '@/components/calendar/calendar-filters'
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid'
import { CalendarWeekList } from '@/components/calendar/calendar-week-list'
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'
import { CalendarEmpty } from '@/components/calendar/calendar-empty'
import { DayDetailModal } from '@/components/calendar/day-detail-modal'
import type { CalendarCountry, CalendarCategory } from '@/types'

/**
 * 메인에 마운트하는 전체 경제 캘린더(월/주 토글·국가/카테고리 필터·날짜 상세 모달).
 * 필터 상태는 전역 useRegion 과 분리된 캘린더 로컬 상태(국가 축이 다름).
 * 데스크탑=월 그리드, 모바일=주별 리스트. 값은 문자열 원문 표시(toUsd 무관).
 */
export function EconomicCalendarSection() {
  const [view, setView] = useState<'week' | 'month'>('month')
  const [country, setCountry] = useState<CalendarCountry>('all')
  const [category, setCategory] = useState<CalendarCategory>('all')
  const [anchor, setAnchor] = useState<string>(() => kstToday())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const todayKey = kstToday()
  const range = useMemo(() => getCalendarRange(view, anchor), [view, anchor])

  const { data, isLoading, isError } = useEconomicCalendar({
    from: range.from,
    to: range.to,
    country,
    category,
  })

  const events = useMemo(() => data?.events ?? [], [data])
  const groups = useMemo(() => buildDateGroups(events, todayKey), [events, todayKey])
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events])

  const periodLabel = view === 'month' ? monthLabel(anchor) : weekRangeLabel(anchor)
  const filtered = country !== 'all' || category !== 'all'
  const hasData = events.length > 0

  function handleShift(dir: -1 | 1) {
    setAnchor((a) => shiftAnchor(view, a, dir))
  }

  function handleSelectDay(dateKey: string) {
    setSelectedDay(dateKey)
    setModalOpen(true)
  }

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []

  return (
    <div>
      {/* 헤더 + 기간 이동 (반응형 표준 패턴) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionHeader
            eyebrow="Economic Calendar"
            title="경제 캘린더"
            description="미국·한국 주요 경제지표 발표 일정"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShift(-1)}
            aria-label={view === 'month' ? '이전 달' : '이전 주'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-foreground/70 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span
            className="num-mono min-w-[7rem] text-center text-sm font-medium text-foreground"
            aria-live="polite"
          >
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={() => handleShift(1)}
            aria-label={view === 'month' ? '다음 달' : '다음 주'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-foreground/70 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <CalendarFilters
          view={view}
          onViewChange={setView}
          category={category}
          onCategoryChange={setCategory}
          country={country}
          onCountryChange={setCountry}
        />
      </div>

      <div className="mt-4">
        {isLoading && !data ? (
          <CalendarSkeleton view={view} />
        ) : isError ? (
          <div className="rounded-md border border-danger/40 bg-danger-bg/50 px-4 py-6 text-center text-sm text-danger">
            경제 캘린더를 불러오지 못했습니다.
          </div>
        ) : !hasData ? (
          <CalendarEmpty filtered={filtered} />
        ) : view === 'month' ? (
          <>
            <div className="hidden lg:block">
              <CalendarMonthGrid
                anchor={anchor}
                todayKey={todayKey}
                events={events}
                onSelectDay={handleSelectDay}
                onShiftMonth={handleShift}
              />
            </div>
            <div className="lg:hidden">
              <CalendarWeekList groups={groups} onSelectDay={handleSelectDay} />
            </div>
          </>
        ) : (
          <CalendarWeekList groups={groups} onSelectDay={handleSelectDay} />
        )}
      </div>

      <DayDetailModal
        dateKey={selectedDay}
        events={selectedEvents}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
