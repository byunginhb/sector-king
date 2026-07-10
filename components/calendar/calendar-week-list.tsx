'use client'

import { cn } from '@/lib/utils'
import { EventPill } from './event-pill'
import type { CalendarDateGroup } from '@/lib/econ-calendar'

interface CalendarWeekListProps {
  groups: CalendarDateGroup[]
  /** 이벤트(행) 클릭 시 해당 날짜 상세 모달 오픈 */
  onSelectDay: (dateKey: string) => void
}

/**
 * 주별/어젠다 날짜 그룹 리스트. 모바일 기본 + 데스크탑 리스트 뷰.
 * 각 날짜 헤더는 sticky(오늘/내일 라벨 강조), 그 아래 이벤트 전량 스택.
 */
export function CalendarWeekList({ groups, onSelectDay }: CalendarWeekListProps) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.dateKey} aria-label={`${g.relativeLabel ?? ''} ${g.dateLabel}`.trim()}>
          <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-surface-1/95 px-1 py-1.5 backdrop-blur">
            {g.relativeLabel && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  g.relativeLabel === '오늘'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-2 text-foreground/80'
                )}
              >
                {g.relativeLabel}
              </span>
            )}
            <h3 className="text-sm font-medium text-foreground/90">{g.dateLabel}</h3>
          </div>
          <ul className="space-y-1.5">
            {g.events.map((e) => (
              <li key={e.id}>
                <EventPill event={e} variant="list" onSelect={onSelectDay} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
