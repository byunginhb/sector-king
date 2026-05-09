import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  id: string
  label: string
}

interface SidebarNavProps {
  items: SidebarNavItem[]
  className?: string
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  return (
    <nav
      aria-label="디자인 시스템 섹션 내비게이션"
      className={cn(
        'sticky top-4 self-start rounded-xl border border-border bg-card p-3',
        className
      )}
    >
      <p className="px-2 pb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`#${item.id}`}
              className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
