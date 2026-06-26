'use client'

import { useCallback, useRef } from 'react'
import { Zap, TrendingUp, type LucideIcon } from 'lucide-react'
import type { RankingHorizon } from '@/lib/api-helpers'
import { cn } from '@/lib/utils'

interface ScoreSortToggleProps {
  value: RankingHorizon
  onChange: (next: RankingHorizon) => void
  className?: string
}

interface OptionDef {
  value: RankingHorizon
  label: string
  /** sm+ 에서만 노출하는 보조 캡션(초보자 친화 — 어려운 용어 금지). */
  caption: string
  icon: LucideIcon
  ariaLabel: string
}

const OPTIONS: readonly OptionDef[] = [
  {
    value: 'short',
    label: '단기',
    caption: '지금 흐름',
    icon: Zap,
    ariaLabel: '단기 점수로 보기 — 지금 분위기·흐름이 좋은 종목',
  },
  {
    value: 'long',
    label: '장기',
    caption: '묵힐 가치',
    icon: TrendingUp,
    ariaLabel: '장기 점수로 보기 — 오래 묵힐 만한 가치가 있는 종목',
  },
] as const

/**
 * 단기/장기 점수 정렬 토글(세그먼트 컨트롤). RegionToggle 과 동일한 radio 패턴.
 * 라벨이 1차 의미, 색은 보조. 화살표 키 이동 지원.
 */
export function ScoreSortToggle({ value, onChange, className }: ScoreSortToggleProps) {
  const buttonRefs = useRef<Record<RankingHorizon, HTMLButtonElement | null>>({
    short: null,
    long: null,
  })

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: RankingHorizon) => {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'Home' &&
        event.key !== 'End'
      ) {
        return
      }
      event.preventDefault()
      const next: RankingHorizon = current === 'short' ? 'long' : 'short'
      if (event.key === 'Home') {
        onChange('short')
        buttonRefs.current.short?.focus()
        return
      }
      if (event.key === 'End') {
        onChange('long')
        buttonRefs.current.long?.focus()
        return
      }
      onChange(next)
      buttonRefs.current[next]?.focus()
    },
    [onChange]
  )

  return (
    <div
      role="radiogroup"
      aria-label="점수 정렬 기준"
      className={cn('inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5', className)}
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[opt.value] = el
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.ariaLabel}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => {
              if (!isSelected) onChange(opt.value)
            }}
            onKeyDown={(event) => handleKeyDown(event, opt.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md font-medium transition',
              'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isSelected
                ? 'bg-background text-foreground shadow-sm ring-1 ring-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5 sm:h-4 sm:w-4',
                isSelected && 'text-primary'
              )}
              aria-hidden="true"
            />
            <span>{opt.label}</span>
            <span className="hidden text-[11px] opacity-70 sm:inline">({opt.caption})</span>
          </button>
        )
      })}
    </div>
  )
}
