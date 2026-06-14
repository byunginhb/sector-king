'use client'

import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Currency } from '@/lib/currency'

export interface CurrencyToggleProps {
  /** 현재 선택된 표시 통화 */
  value: Currency
  /** 변경 콜백 (controlled) */
  onChange: (next: Currency) => void
  /** 추가 클래스명 */
  className?: string
  /** 크기 (협소 영역용 sm / 기본 md) */
  size?: 'sm' | 'md'
  /** 텍스트 라벨 숨기고 글리프(₩/$)만 노출 (초협소 영역). sr-only 라벨은 유지. 기본 false */
  glyphOnly?: boolean
  /** a11y 그룹 라벨. 기본 '표시 통화 선택' */
  ariaLabel?: string
}

interface OptionDef {
  value: Currency
  glyph: string
  label: string
  ariaLabel: string
}

const OPTIONS: readonly OptionDef[] = [
  { value: 'KRW', glyph: '₩', label: '원', ariaLabel: '원화(₩)로 표시' },
  { value: 'USD', glyph: '$', label: '달러', ariaLabel: '달러($)로 표시' },
] as const

export function CurrencyToggle({
  value,
  onChange,
  className,
  size = 'md',
  glyphOnly = false,
  ariaLabel,
}: CurrencyToggleProps) {
  const buttonRefs = useRef<Record<Currency, HTMLButtonElement | null>>({
    KRW: null,
    USD: null,
  })

  const focusOption = useCallback((target: Currency) => {
    const el = buttonRefs.current[target]
    if (el) el.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: Currency) => {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'Home' &&
        event.key !== 'End'
      ) {
        return
      }
      event.preventDefault()
      const currentIdx = OPTIONS.findIndex((o) => o.value === current)
      let nextIdx = currentIdx
      if (event.key === 'ArrowLeft') {
        nextIdx = currentIdx <= 0 ? OPTIONS.length - 1 : currentIdx - 1
      } else if (event.key === 'ArrowRight') {
        nextIdx = currentIdx >= OPTIONS.length - 1 ? 0 : currentIdx + 1
      } else if (event.key === 'Home') {
        nextIdx = 0
      } else if (event.key === 'End') {
        nextIdx = OPTIONS.length - 1
      }
      const next = OPTIONS[nextIdx]
      if (next && next.value !== current) {
        onChange(next.value)
        focusOption(next.value)
      }
    },
    [focusOption, onChange]
  )

  const buttonSizeClass =
    size === 'sm'
      ? 'px-2 py-1 text-xs'
      : 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm'

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? '표시 통화 선택'}
      className={cn(
        'inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5',
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              buttonSizeClass,
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="num-mono tabular-nums" aria-hidden="true">
              {opt.glyph}
            </span>
            {glyphOnly ? (
              <span className="sr-only">{opt.label}</span>
            ) : (
              <span>{opt.label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
