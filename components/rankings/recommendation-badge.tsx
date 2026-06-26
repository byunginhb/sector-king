'use client'

import { MinusCircle } from 'lucide-react'
import { formatRecommendation } from '@/lib/format'
import { cn } from '@/lib/utils'

interface RecommendationBadgeProps {
  recommendationKey: string | null
  analystCount: number | null
  className?: string
}

/** 투자의견 톤 매핑(라벨이 1차 의미, 색은 보조 — 색만으로 의미 전달 금지). */
function toneClass(key: string | null): string {
  switch (key) {
    case 'strong_buy':
      return 'bg-success-bg text-success border-success/30'
    case 'buy':
      return 'bg-success-bg/60 text-success border-success/20'
    case 'hold':
      return 'bg-muted text-muted-foreground border-border'
    case 'underperform':
    case 'sell':
      return 'bg-danger-bg text-danger border-danger/30'
    default:
      return 'bg-muted/50 text-muted-foreground border-dashed border-border'
  }
}

/**
 * 투자의견 Badge — RECOMMENDATION_LABELS(lib/format) 재사용.
 * 결손(null/'none')은 "커버리지 없음" 회색 칩(lucide MinusCircle, 이모지 금지).
 */
export function RecommendationBadge({
  recommendationKey,
  analystCount,
  className,
}: RecommendationBadgeProps) {
  const isMissing = !recommendationKey || recommendationKey === 'none'
  const label = isMissing ? '커버리지 없음' : formatRecommendation(recommendationKey)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        toneClass(isMissing ? null : recommendationKey),
        className
      )}
      aria-label={
        isMissing
          ? '투자의견: 커버리지 없음'
          : `투자의견: ${label}${analystCount ? `, 애널리스트 ${analystCount}명` : ''}`
      }
    >
      {isMissing && <MinusCircle className="h-3 w-3 shrink-0" aria-hidden />}
      <span>{label}</span>
      {!isMissing && analystCount != null && analystCount > 0 && (
        <span className="text-[10px] opacity-70 tabular-nums">({analystCount}명)</span>
      )}
    </span>
  )
}
