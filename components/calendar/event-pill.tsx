'use client'

import { Star, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EconomicEvent, CalendarCountryValue, EconomicImportance } from '@/types'

/** 국가 배지 메타 — 텍스트(US/KR) + 색 dot 병기(색 단독 금지). */
const COUNTRY_META: Record<
  CalendarCountryValue,
  { label: string; aria: string; dot: string }
> = {
  US: { label: 'US', aria: '미국', dot: 'bg-primary' },
  KR: { label: 'KR', aria: '대한민국', dot: 'bg-success' },
}

/** 중요도 → 좌측 색바(형태·색 이중 인코딩). */
const IMPORTANCE_BAR: Record<EconomicImportance, string> = {
  high: 'border-l-danger',
  medium: 'border-l-warning',
  low: 'border-l-border-subtle',
}

/** 국가 텍스트 배지 + 색 dot. 이모지 국기 대체. */
export function CountryBadge({ country }: { country: CalendarCountryValue }) {
  const m = COUNTRY_META[country]
  return (
    <span
      className="inline-flex items-center gap-1 num-mono text-[10px] leading-none px-1 py-0.5 rounded border border-border-subtle text-foreground/80"
      aria-label={m.aria}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 rounded-full', m.dot)}
        aria-hidden
      />
      {m.label}
    </span>
  )
}

/** 중요도 마커(Star fill=주요, Circle=보통, 낮음=없음). */
function ImportanceMarker({ importance }: { importance: EconomicImportance }) {
  if (importance === 'high') {
    return (
      <Star
        className="h-3 w-3 shrink-0 fill-danger text-danger"
        aria-label="중요도 높음"
      />
    )
  }
  if (importance === 'medium') {
    return (
      <Circle className="h-3 w-3 shrink-0 text-warning" aria-label="중요도 보통" />
    )
  }
  return null
}

/** value 에 단위가 이미 없으면 단위를 붙여 표기. */
function formatValue(value: string, unit: string | null): string {
  if (!unit) return value
  return value.includes(unit) ? value : `${value}${unit}`
}

/** 예상/이전/실제 요약 줄. 실제가 예상 대비 상/하회 시 방향 색. */
function ValueLine({ event }: { event: EconomicEvent }) {
  const { actual, forecast, previous, unit } = event
  if (!actual && !forecast && !previous) return null

  let actualTone = 'text-foreground'
  if (actual && forecast) {
    const a = Number.parseFloat(actual)
    const f = Number.parseFloat(forecast)
    if (!Number.isNaN(a) && !Number.isNaN(f)) {
      actualTone = a > f ? 'text-success' : a < f ? 'text-danger' : 'text-foreground'
    }
  }

  return (
    <p className="mt-0.5 num-mono text-xs text-muted-foreground">
      {actual && (
        <span className={actualTone} title="예상 상회/하회 방향">
          실제 {formatValue(actual, unit)}
        </span>
      )}
      {actual && (forecast || previous) && <span className="px-1">·</span>}
      {forecast && <span>예상 {formatValue(forecast, unit)}</span>}
      {forecast && previous && <span className="px-1">·</span>}
      {previous && <span>이전 {formatValue(previous, unit)}</span>}
    </p>
  )
}

interface EventPillProps {
  event: EconomicEvent
  /** grid=셀 내부 콤팩트 span, list=상세 라인(클릭 가능) */
  variant: 'grid' | 'list'
  /** list variant 에서 클릭 시 해당 날짜 상세 모달 오픈 */
  onSelect?: (dateKey: string) => void
}

/**
 * 이벤트 한 줄. grid=비상호작용 span(셀이 클릭 처리), list=버튼(모달 오픈).
 * 국가 배지·중요도 마커·제목·시각을 이모지 없이 표기.
 */
export function EventPill({ event, variant, onSelect }: EventPillProps) {
  const bar = IMPORTANCE_BAR[event.importance]

  if (variant === 'grid') {
    return (
      <span
        className={cn(
          'flex items-center gap-1 border-l-2 pl-1 py-px rounded-sm',
          bar
        )}
      >
        <CountryBadge country={event.country} />
        <span className="truncate text-[11px] leading-tight text-foreground/90">
          {event.title}
        </span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event.dateKst)}
      className={cn(
        'block w-full border-l-2 pl-3 pr-2 py-2 text-left rounded-sm transition-colors hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        bar
      )}
    >
      <span className="flex items-center gap-2 flex-wrap">
        <CountryBadge country={event.country} />
        {event.time && (
          <span className="num-mono text-[11px] text-muted-foreground">
            {event.time}
          </span>
        )}
        <ImportanceMarker importance={event.importance} />
        {event.importance === 'high' && (
          <span className="rounded bg-danger-bg px-1 py-0.5 text-[10px] font-medium text-danger">
            주요
          </span>
        )}
      </span>
      <span className="mt-1 block text-sm leading-snug text-foreground">
        {event.title}
      </span>
      <ValueLine event={event} />
    </button>
  )
}
