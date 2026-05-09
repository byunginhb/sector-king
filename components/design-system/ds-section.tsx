import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DsSectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function DsSection({ id, title, description, children, className }: DsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 border-b border-border/60 pb-10 mb-10 last:border-b-0',
        className
      )}
    >
      <header className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold leading-tight text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

interface DsSubsectionProps {
  title: string
  children: ReactNode
  description?: string
  className?: string
}

export function DsSubsection({ title, description, children, className }: DsSubsectionProps) {
  return (
    <div className={cn('mt-6 first:mt-0', className)}>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description ? (
        <p className="text-xs sm:text-sm text-muted-foreground mb-3">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
