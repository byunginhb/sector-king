'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CountryBadge } from './event-pill'
import { formatDayLabel } from '@/lib/econ-calendar'
import { cn } from '@/lib/utils'
import type { EconomicEvent } from '@/types'

interface DayDetailModalProps {
  /** 선택 날짜 'YYYY-MM-DD' (없으면 닫힘) */
  dateKey: string | null
  /** 해당 날짜 이벤트 전량(시간 오름차순) */
  events: EconomicEvent[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ValueCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="num-mono text-sm text-foreground">{value ?? '–'}</dd>
    </div>
  )
}

/** 날짜 클릭 시 그날 전체 이벤트(시간·국가·중요도·실제/예상/이전)를 표기. */
export function DayDetailModal({ dateKey, events, open, onOpenChange }: DayDetailModalProps) {
  const label = dateKey ? formatDayLabel(dateKey) : ''
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{events.length}건의 경제지표 발표</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto">
          {events.map((e) => (
            <li
              key={e.id}
              className={cn(
                'rounded-md border-l-2 bg-muted/30 py-2.5 pl-3 pr-3',
                e.importance === 'high'
                  ? 'border-l-danger'
                  : e.importance === 'medium'
                    ? 'border-l-warning'
                    : 'border-l-border-subtle'
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <CountryBadge country={e.country} />
                {e.time && (
                  <span className="num-mono text-[11px] text-muted-foreground">{e.time}</span>
                )}
                {e.importance === 'high' && (
                  <span className="rounded bg-danger-bg px-1 py-0.5 text-[10px] font-medium text-danger">
                    주요
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{e.title}</p>
              {(e.actual || e.forecast || e.previous) && (
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  <ValueCell label="실제" value={e.actual} />
                  <ValueCell label="예상" value={e.forecast} />
                  <ValueCell label="이전" value={e.previous} />
                </dl>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
