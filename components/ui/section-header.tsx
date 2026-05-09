import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{title}</h2>
        {description ? (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  )
}
