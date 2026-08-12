'use client'

import { LayoutGrid, Globe2, Flag, DollarSign, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CalendarLegend } from './calendar-legend'
import { CATEGORY_META } from './category-meta'
import type { CalendarCountry, CalendarCategory } from '@/types'

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-md font-medium transition px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

interface CategoryDef {
  value: CalendarCategory
  label: string
  icon: LucideIcon
}

// 'event' 는 수집 소스도 정의도 없이 비어 있던 탭이라 제거했다.
const CATEGORIES: readonly CategoryDef[] = [
  { value: 'all', label: '전체', icon: LayoutGrid },
  { value: 'indicator', ...CATEGORY_META.indicator },
  { value: 'earnings', ...CATEGORY_META.earnings },
]

interface CountryDef {
  value: CalendarCountry
  label: string
  icon: LucideIcon
  aria: string
}

// RegionToggle 과 동형이지만 값이 'all'|'kr'|'us'(이벤트 국가 축) — 전역 useRegion 과 분리.
const COUNTRIES: readonly CountryDef[] = [
  { value: 'all', label: '전체', icon: Globe2, aria: '전체 국가' },
  { value: 'kr', label: '국내', icon: Flag, aria: '국내 일정만 보기' },
  { value: 'us', label: '미국', icon: DollarSign, aria: '미국 일정만 보기' },
]

const VIEWS: readonly { value: 'week' | 'month'; label: string }[] = [
  { value: 'week', label: '주별' },
  { value: 'month', label: '월별' },
]

interface CalendarFiltersProps {
  view: 'week' | 'month'
  onViewChange: (v: 'week' | 'month') => void
  category: CalendarCategory
  onCategoryChange: (c: CalendarCategory) => void
  country: CalendarCountry
  onCountryChange: (c: CalendarCountry) => void
}

export function CalendarFilters({
  view,
  onViewChange,
  category,
  onCategoryChange,
  country,
  onCountryChange,
}: CalendarFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* 카테고리 + 국가 + 뷰 토글 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* 카테고리 pill */}
        <div
          role="group"
          aria-label="이벤트 유형 필터"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-0.5"
        >
          {CATEGORIES.map((c) => {
            const isOn = category === c.value
            const Icon = c.icon
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={isOn}
                onClick={() => {
                  if (!isOn) onCategoryChange(c.value)
                }}
                className={cn(
                  PILL_BASE,
                  isOn
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 국가 토글 (calendar-local) */}
          <div
            role="group"
            aria-label="국가 필터"
            className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {COUNTRIES.map((c) => {
              const isOn = country === c.value
              const Icon = c.icon
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={isOn}
                  aria-label={c.aria}
                  onClick={() => {
                    if (!isOn) onCountryChange(c.value)
                  }}
                  className={cn(
                    PILL_BASE,
                    isOn
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span>{c.label}</span>
                </button>
              )
            })}
          </div>

          {/* 주/월 뷰 토글 — 모바일은 하루 보기 고정이라 lg 이상에서만 노출 */}
          <div
            role="group"
            aria-label="캘린더 보기 방식"
            className="hidden lg:inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {VIEWS.map((v) => {
              const isOn = view === v.value
              return (
                <button
                  key={v.value}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => {
                    if (!isOn) onViewChange(v.value)
                  }}
                  className={cn(
                    PILL_BASE,
                    isOn
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <CalendarLegend />
    </div>
  )
}
