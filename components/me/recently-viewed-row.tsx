/**
 * 가로 스크롤 최근 본 종목/섹터/산업 카드 리스트.
 */
'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import { useRecentlyViewed } from '@/hooks/me/use-recently-viewed'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecentlyViewedItemDTO } from '@/drizzle/supabase-schema'

export function RecentlyViewedRow({ limit = 12 }: { limit?: number }) {
  const { items, isLoading } = useRecentlyViewed({ limit })

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-32 shrink-0" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {items.map((item) => (
        <RecentlyViewedItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function RecentlyViewedItem({ item }: { item: RecentlyViewedItemDTO }) {
  const href = hrefFor(item)
  const Wrapper = href
    ? ({ children }: { children: React.ReactNode }) => (
        <Link
          href={href}
          className="block rounded-lg border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors px-3 py-2 min-w-[140px] shrink-0"
        >
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="block rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 min-w-[140px] shrink-0">
          {children}
        </div>
      )

  return (
    <Wrapper>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-2.5 w-2.5" aria-hidden />
        {labelFor(item.itemType)}
      </p>
      <p className="text-sm font-medium text-foreground truncate">
        {item.displayName ?? item.itemKey}
      </p>
    </Wrapper>
  )
}

function labelFor(t: RecentlyViewedItemDTO['itemType']) {
  switch (t) {
    case 'ticker':
      return '회사'
    case 'sector':
      return '섹터'
    case 'industry':
      return '산업'
    case 'news':
      return '리포트'
  }
}

function hrefFor(item: RecentlyViewedItemDTO): string | null {
  switch (item.itemType) {
    case 'industry':
      return `/${item.itemKey}`
    case 'news':
      return `/news/${item.itemKey}`
    case 'sector':
    case 'ticker':
    default:
      return null
  }
}
