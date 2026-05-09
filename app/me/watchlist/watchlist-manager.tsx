/**
 * 워치리스트 관리 (필터: ticker/sector/industry/all + 단건 삭제).
 */
'use client'

import { useState } from 'react'
import { Trash2, Star } from 'lucide-react'
import { useWatchlist } from '@/hooks/me/use-watchlist'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  WatchlistItemDTO,
  WatchlistItemType,
} from '@/drizzle/supabase-schema'

type Filter = 'all' | WatchlistItemType

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'ticker', label: '회사' },
  { value: 'sector', label: '섹터' },
  { value: 'industry', label: '산업' },
]

export function WatchlistManager() {
  const [filter, setFilter] = useState<Filter>('all')
  const { items, isLoading, remove } = useWatchlist()

  const filtered =
    filter === 'all' ? items : items.filter((i) => i.itemType === filter)

  return (
    <div className="space-y-4">
      <div role="group" aria-label="워치리스트 필터" className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-colors',
              filter === f.value
                ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                : 'border-border-subtle hover:bg-surface-2'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <WatchlistRow
              key={item.id}
              item={item}
              onRemove={() => remove(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function WatchlistRow({
  item,
  onRemove,
}: {
  item: WatchlistItemDTO
  onRemove: () => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:bg-surface-2 transition-colors">
      <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {item.displayName ?? item.itemKey}
        </p>
        <p className="text-xs text-muted-foreground truncate tabular-nums">
          {labelFor(item.itemType)} · {item.itemKey}
        </p>
      </div>
      <button
        type="button"
        aria-label="워치리스트에서 제거"
        onClick={() => {
          if (confirm('이 항목을 워치리스트에서 제거할까요?')) onRemove()
        }}
        className="text-muted-foreground hover:text-danger p-1.5 rounded"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-surface-1/50 p-8 text-center">
      <Star
        className="h-7 w-7 mx-auto text-muted-foreground mb-2"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground mb-1">
        {filter === 'all'
          ? '아직 추가한 워치리스트가 없습니다'
          : '이 분류에 추가한 항목이 없습니다'}
      </p>
      <p className="text-xs text-muted-foreground">
        산업/섹터/회사 카드의 별표를 눌러 추적을 시작하세요.
      </p>
    </div>
  )
}

function labelFor(t: WatchlistItemType) {
  switch (t) {
    case 'ticker':
      return '회사'
    case 'sector':
      return '섹터'
    case 'industry':
      return '산업'
  }
}
