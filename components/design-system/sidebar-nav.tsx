import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  id: string
  label: string
  meta?: string
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
        'sticky top-6 self-start border-l border-border-subtle pl-4',
        className
      )}
    >
      <p className="eyebrow mb-4">Contents</p>
      <ul className="flex flex-col gap-0">
        {items.map((item) => (
          <li key={item.id} className="border-b border-border-subtle/70 last:border-b-0">
            <Link
              href={`#${item.id}`}
              className="group flex items-baseline gap-3 py-2 text-sm text-foreground/75 hover:text-foreground transition-colors"
            >
              {item.meta ? (
                <span className="font-mono text-[10px] text-muted-foreground group-hover:text-primary">
                  {item.meta}
                </span>
              ) : null}
              <span className="font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
