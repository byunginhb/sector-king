'use client'

import { useCallback, useRef } from 'react'
import { Zap, Scale, TrendingUp, type LucideIcon } from 'lucide-react'
import {
  PICK_PROFILES,
  PICK_PROFILE_META,
  type PickProfile,
} from '@/lib/pick-profile'
import { cn } from '@/lib/utils'

interface PickProfileToggleProps {
  value: PickProfile
  onChange: (next: PickProfile) => void
  className?: string
}

const ICONS: Record<PickProfile, LucideIcon> = {
  short: Zap,
  balanced: Scale,
  long: TrendingUp,
}

/**
 * 섹터킹 픽 성향(단기/균형/장기) 세그먼티드 컨트롤. RegionToggle·ScoreSortToggle 과 동일
 * radio 패턴(화살표 키 이동). 선택에 따라 픽 가중치가 달라진다(가중치 SoT: lib/pick-profile).
 */
export function PickProfileToggle({ value, onChange, className }: PickProfileToggleProps) {
  const buttonRefs = useRef<Record<PickProfile, HTMLButtonElement | null>>({
    short: null,
    balanced: null,
    long: null,
  })

  const move = useCallback(
    (current: PickProfile, dir: 1 | -1) => {
      const idx = PICK_PROFILES.indexOf(current)
      const next = PICK_PROFILES[(idx + dir + PICK_PROFILES.length) % PICK_PROFILES.length]
      onChange(next)
      buttonRefs.current[next]?.focus()
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: PickProfile) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(current, 1)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        move(current, -1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        onChange(PICK_PROFILES[0])
        buttonRefs.current[PICK_PROFILES[0]]?.focus()
      } else if (event.key === 'End') {
        event.preventDefault()
        const last = PICK_PROFILES[PICK_PROFILES.length - 1]
        onChange(last)
        buttonRefs.current[last]?.focus()
      }
    },
    [move, onChange]
  )

  return (
    <div
      role="radiogroup"
      aria-label="섹터킹 픽 투자 성향"
      className={cn('inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5', className)}
    >
      {PICK_PROFILES.map((profile) => {
        const meta = PICK_PROFILE_META[profile]
        const isSelected = value === profile
        const Icon = ICONS[profile]
        return (
          <button
            key={profile}
            ref={(el) => {
              buttonRefs.current[profile] = el
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${meta.label} (${meta.caption}) 성향으로 보기`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => {
              if (!isSelected) onChange(profile)
            }}
            onKeyDown={(event) => handleKeyDown(event, profile)}
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
              className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', isSelected && 'text-primary')}
              aria-hidden="true"
            />
            <span>{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}
