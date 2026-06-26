'use client'

import { cn } from '@/lib/utils'

interface ScoreBarProps {
  /** 0~100 점수. null 이면 "—" 표기(결손). */
  score: number | null
  /** 토글이 부각하는 점수면 강조(굵게·진하게 + 막대 진하게). */
  emphasized?: boolean
  /** 점수 라벨(예: "단기 점수") — aria 용. */
  label: string
  className?: string
}

/**
 * 점수 막대 + 숫자(progressbar). 점수가 주인공이므로 숫자를 먼저·또렷하게.
 * 토큰 색만 사용, 빨강(danger)은 하락/매도 의미에 예약 → 점수엔 쓰지 않는다.
 * - 상위(≥75): primary(amber, 킹 강조)
 * - 중위(40~75): chart-2(슬레이트 틸)
 * - 하위(<40): muted-foreground (차분한 회색)
 * 강조(emphasized) 시 막대를 진하게, 숫자를 크고 진하게 — 선택된 토글 축과 시각 연동.
 */
export function ScoreBar({ score, emphasized, label, className }: ScoreBarProps) {
  if (score === null) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-1.5 w-full max-w-[88px] rounded-full bg-muted/60" aria-hidden />
        <span
          className="num-mono shrink-0 text-sm text-muted-foreground/70"
          aria-label={`${label} 없음`}
        >
          —
        </span>
      </div>
    )
  }

  const rounded = Math.round(score)
  const fillTone =
    rounded >= 75
      ? emphasized
        ? 'bg-primary'
        : 'bg-primary/70'
      : rounded >= 40
        ? emphasized
          ? 'bg-chart-2'
          : 'bg-chart-2/70'
        : 'bg-muted-foreground/40'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'h-1.5 w-full max-w-[88px] overflow-hidden rounded-full',
          emphasized ? 'bg-muted' : 'bg-muted/70'
        )}
        role="progressbar"
        aria-label={label}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', fillTone)}
          style={{ width: `${Math.max(Math.min(rounded, 100), 3)}%` }}
        />
      </div>
      <span
        className={cn(
          'num-mono shrink-0 tabular-nums',
          emphasized
            ? 'text-[15px] font-semibold text-foreground'
            : 'text-sm text-muted-foreground'
        )}
      >
        {rounded}
      </span>
    </div>
  )
}
