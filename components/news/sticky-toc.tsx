/**
 * 우측 sticky TOC (lg+) / 모바일에서는 collapsible.
 */
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TocSection {
  id: string
  title: string
}

interface StickyTocProps {
  sections: TocSection[]
  className?: string
}

export function StickyToc({ sections, className }: StickyTocProps) {
  const [active, setActive] = useState<string | null>(
    sections[0]?.id ?? null
  )

  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav
      aria-label="리포트 목차"
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-1 p-4',
        className
      )}
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        목차
      </h3>
      <ul className="space-y-1">
        {sections.map((s) => {
          const isActive = active === s.id
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block text-sm py-1 px-2 rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
                )}
              >
                {s.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
