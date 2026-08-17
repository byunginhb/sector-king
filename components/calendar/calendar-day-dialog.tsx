'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EventPill } from './event-pill'
import { formatDayLabel, relativeDayLabel } from '@/lib/econ-calendar'
import type { EconomicEvent } from '@/types'

interface CalendarDayDialogProps {
  /** 열려 있는 날짜 'YYYY-MM-DD'. null 이면 닫힘. */
  dateKey: string | null
  todayKey: string
  events: EconomicEvent[]
  onClose: () => void
}

/**
 * 월 그리드 한 칸의 "+N개 더" 를 눌렀을 때 그 하루 일정을 전부 보여주는 창.
 *
 * 월 그리드 칸은 2건까지만 그린다 — 실적 시즌 하루에 35건이 몰리면 칸 높이가
 * 그 날에 맞춰 늘어나 달력이 세로로 무너진다. 그래서 나머지는 여기서 본다.
 * 항목은 주별 리스트와 같은 `list` 변형이라 시각·중요도·값이 그대로 나오고,
 * 출처가 있으면 링크도 동일하게 동작한다(실적 → 종목 상세).
 */
export function CalendarDayDialog({
  dateKey,
  todayKey,
  events,
  onClose,
}: CalendarDayDialogProps) {
  const open = dateKey !== null
  const rel = dateKey ? relativeDayLabel(dateKey, todayKey) : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/*
        DialogContent 기본이 `grid` 인데 auto 행은 max-height 아래로 줄지 않아
        목록이 창 밖으로 잘려 나간다(스크롤도 안 걸린다). flex 로 바꿔야
        min-h-0 목록이 남은 높이만 차지하고 그 안에서 스크롤된다.
      */}
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rel && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {rel}
              </span>
            )}
            {dateKey ? formatDayLabel(dateKey) : ''}
          </DialogTitle>
          <DialogDescription>일정 {events.length}건</DialogDescription>
        </DialogHeader>

        {/* 37건까지 쌓이므로 목록만 스크롤한다(헤더는 고정). */}
        <ul className="-mr-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2">
          {events.map((e) => (
            <li key={e.id}>
              <EventPill event={e} variant="list" />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
