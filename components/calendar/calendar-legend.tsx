'use client'

import { Star, Circle } from 'lucide-react'
import { CATEGORY_META } from './category-meta'
import { CountryBadge } from './event-pill'

/**
 * 범례 — 실제로 렌더되는 표식만 설명한다.
 *
 * 카테고리=아이콘, 국가=배지(텍스트+색 dot), 중요도=마커.
 * (이전 버전은 "카테고리 색 dot"을 설명했지만 항목의 dot 은 국가 색이었다.)
 * 접근성: 색 단독 금지 → 항상 텍스트 라벨/아이콘 병기.
 */
export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
      {Object.entries(CATEGORY_META).map(([key, meta]) => {
        const Icon = meta.icon
        return (
          <span key={key} className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" aria-hidden />
            {meta.label}
          </span>
        )
      })}
      <span className="inline-flex items-center gap-1">
        <CountryBadge country="US" />
        미국
      </span>
      <span className="inline-flex items-center gap-1">
        <CountryBadge country="KR" />
        한국
      </span>
      <span className="inline-flex items-center gap-1">
        <Star className="h-3 w-3 fill-danger text-danger" aria-hidden />
        주요
      </span>
      <span className="inline-flex items-center gap-1">
        <Circle className="h-3 w-3 text-warning" aria-hidden />
        보통
      </span>
    </div>
  )
}
