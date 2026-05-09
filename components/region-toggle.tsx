'use client'

import { useCallback, useRef } from 'react'
import { Earth, Flag, Globe2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

export interface RegionToggleProps {
  /** 현재 선택된 region */
  value: RegionFilter
  /** 변경 콜백 (controlled) */
  onChange: (next: RegionFilter) => void
  /** 추가 클래스명 */
  className?: string
  /** 작은 크기 (대시보드 카드 등 작은 영역용) */
  size?: 'sm' | 'md'
  /** 옵션별 비활성화 (특정 region에 데이터 없음을 알릴 때) */
  disabledOptions?: RegionFilter[]
  /** a11y label - 그룹 설명 */
  ariaLabel?: string
  /** 데이터 카운트(선택) — 옵션 옆 작은 숫자로 표시 */
  counts?: Partial<Record<RegionFilter, number>>
}

interface OptionDef {
  value: RegionFilter
  label: string
  icon: LucideIcon
  ariaLabel: string
}

const OPTIONS: readonly OptionDef[] = [
  { value: 'all', label: '전체', icon: Globe2, ariaLabel: '전체 region' },
  { value: 'kr', label: '국내', icon: Flag, ariaLabel: '국내 종목만 보기' },
  { value: 'global', label: '해외', icon: Earth, ariaLabel: '해외 종목만 보기' },
] as const

export function RegionToggle({
  value,
  onChange,
  className,
  size = 'md',
  disabledOptions,
  ariaLabel,
  counts,
}: RegionToggleProps) {
  const buttonRefs = useRef<Record<RegionFilter, HTMLButtonElement | null>>({
    all: null,
    kr: null,
    global: null,
  })

  const isDisabled = useCallback(
    (r: RegionFilter) => disabledOptions?.includes(r) ?? false,
    [disabledOptions]
  )

  const focusOption = useCallback(
    (target: RegionFilter) => {
      const el = buttonRefs.current[target]
      if (el) el.focus()
    },
    []
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: RegionFilter) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
        return
      }
      event.preventDefault()
      const enabledOptions = OPTIONS.filter((o) => !isDisabled(o.value))
      if (enabledOptions.length === 0) return
      const currentIdx = enabledOptions.findIndex((o) => o.value === current)
      let nextIdx = currentIdx
      if (event.key === 'ArrowLeft') {
        nextIdx = currentIdx <= 0 ? enabledOptions.length - 1 : currentIdx - 1
      } else if (event.key === 'ArrowRight') {
        nextIdx = currentIdx >= enabledOptions.length - 1 ? 0 : currentIdx + 1
      } else if (event.key === 'Home') {
        nextIdx = 0
      } else if (event.key === 'End') {
        nextIdx = enabledOptions.length - 1
      }
      const next = enabledOptions[nextIdx]
      if (next && next.value !== current) {
        onChange(next.value)
        focusOption(next.value)
      }
    },
    [focusOption, isDisabled, onChange]
  )

  const buttonSizeClass =
    size === 'sm'
      ? 'px-2 py-1 text-xs'
      : 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm'

  const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? 'Region 필터'}
      className={cn(
        'inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5',
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        const disabled = isDisabled(opt.value)
        const Icon = opt.icon
        const count = counts?.[opt.value]

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
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => {
              if (disabled) return
              if (!isSelected) onChange(opt.value)
            }}
            onKeyDown={(event) => handleKeyDown(event, opt.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md font-medium transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              buttonSizeClass,
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'opacity-40 cursor-not-allowed hover:text-muted-foreground'
            )}
          >
            <Icon className={iconSizeClass} aria-hidden="true" />
            <span>{opt.label}</span>
            {count != null && (
              <span className="ml-0.5 text-[10px] tabular-nums opacity-70">
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
