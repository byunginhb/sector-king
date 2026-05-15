import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DsSectionProps {
  id: string
  title: string
  description?: string
  meta?: string
  children: ReactNode
  className?: string
}

export function DsSection({
  id,
  title,
  description,
  meta,
  children,
  className,
}: DsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 border-t border-foreground/80 pt-8 pb-14 first:border-t-0 first:pt-0',
        className
      )}
    >
      <header className="mb-8 grid grid-cols-1 md:grid-cols-[88px_1fr] gap-3 md:gap-6 items-baseline">
        {meta ? <p className="eyebrow tabular-nums">{meta}</p> : <span />}
        <div>
          <h2 className="display text-3xl sm:text-4xl text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm sm:text-base text-foreground/75 mt-3 max-w-2xl leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  )
}

interface DsSubsectionProps {
  title: string
  children: ReactNode
  description?: string
  hint?: string
  className?: string
}

export function DsSubsection({
  title,
  description,
  hint,
  children,
  className,
}: DsSubsectionProps) {
  return (
    <div className={cn('mt-10 first:mt-0', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-4 border-b border-border-subtle pb-2">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        {hint ? <p className="eyebrow">{hint}</p> : null}
      </div>
      {description ? (
        <p className="text-xs sm:text-sm text-foreground/70 mb-4 max-w-2xl">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
