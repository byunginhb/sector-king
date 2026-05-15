import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  /** 신문지 카테고리 라벨. uppercase mono + amber 강조. 없으면 노출 안 함. */
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

/**
 * 표준 섹션 헤더 — Editorial Bloomberg Terminal 톤.
 *
 *  ┌────────────────────────────────────────────────┬──────────┐
 *  │ EYEBROW (mono uppercase · amber)               │ actions  │
 *  │ Title  (Fraunces 시리프 · 의미 단위)              │          │
 *  │ description (sans · foreground/70)             │          │
 *  └────────────────────────────────────────────────┴──────────┘
 */
export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border-subtle pb-3',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow eyebrow-accent mb-1.5">{eyebrow}</p> : null}
        <h2 className="font-display text-xl sm:text-2xl font-semibold leading-tight text-foreground tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-xs sm:text-sm text-foreground/70 mt-1.5 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-1 flex-wrap shrink-0">{actions}</div> : null}
    </div>
  )
}
