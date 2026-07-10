'use client'

import { Star, Circle } from 'lucide-react'

/** 카테고리 색 dot 범례(라벨 병기, 색 단독 금지). */
const CATEGORY_LEGEND: { label: string; dot: string }[] = [
  { label: '경제지표', dot: 'bg-primary' },
  { label: '실적발표', dot: 'bg-success' },
  { label: '이벤트', dot: 'bg-warning' },
]

/**
 * 범례 — 카테고리 색 dot + 중요도 마커 의미.
 * 접근성: 색 단독 금지 → 항상 텍스트 라벨/아이콘 병기.
 */
export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
      {CATEGORY_LEGEND.map((c) => (
        <span key={c.label} className="inline-flex items-center gap-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${c.dot}`}
            aria-hidden
          />
          {c.label}
        </span>
      ))}
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
