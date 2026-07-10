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
  /** grid=셀 내부 콤팩트 라인, list=상세 라인 */
  variant: 'grid' | 'list'
}

/** 출처가 있을 때 새 탭 링크로 감싸는 aria-label 문구. */
function sourceAriaLabel(title: string): string {
  return `${title} — 새 탭에서 출처 열기`
}

/**
 * 이벤트 한 줄. grid=셀 내부 콤팩트 라인, list=상세 라인.
 *
 * 출처(sourceUrl)가 있으면 항목 전체가 새 탭 링크(<a>)가 되고 hover 시
 * 밑줄/색으로 클릭 가능함을 암시한다. 출처가 없으면 비클릭 span/div 로 렌더.
 * 국가 배지·중요도 마커·제목·시각을 이모지 없이 표기.
 */
export function EventPill({ event, variant }: EventPillProps) {
  const bar = IMPORTANCE_BAR[event.importance]
  // 렌더 측 스킴 가드(심층방어) — http(s) 아닌 URL(javascript: 등)은 링크화하지 않음.
  const href =
    event.sourceUrl && /^https?:\/\//i.test(event.sourceUrl) ? event.sourceUrl : null

  if (variant === 'grid') {
    const base = cn(
      'group flex items-center gap-1 border-l-2 pl-1 py-px rounded-sm',
      bar
    )
    const inner = (
      <>
        <CountryBadge country={event.country} />
        <span
          className={cn(
            'truncate text-[11px] leading-tight text-foreground/90',
            href &&
              'underline-offset-2 decoration-dotted group-hover:underline group-hover:text-primary'
          )}
        >
          {event.title}
        </span>
      </>
    )

    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={sourceAriaLabel(event.title)}
          // 월 그리드는 로빙 tabindex(셀 단위 방향키 탐색)라 링크를 Tab 순서에서 제외.
          // 키보드 접근은 주별 리스트 뷰(list variant, 자연 Tab 순서)로 위임.
          tabIndex={-1}
          className={cn(
            base,
            'transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          {inner}
        </a>
      )
    }
    return <span className={base}>{inner}</span>
  }

  const base = cn(
    'group block w-full border-l-2 pl-3 pr-2 py-2 text-left rounded-sm',
    bar
  )
  const inner = (
    <>
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
      <span
        className={cn(
          'mt-1 block text-sm leading-snug text-foreground',
          href &&
            'underline-offset-2 decoration-dotted group-hover:underline group-hover:text-primary'
        )}
      >
        {event.title}
      </span>
      <ValueLine event={event} />
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={sourceAriaLabel(event.title)}
        className={cn(
          base,
          'transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
      >
        {inner}
      </a>
    )
  }
  return <div className={base}>{inner}</div>
}
