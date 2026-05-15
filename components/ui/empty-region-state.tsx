import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RegionFilter } from '@/types'

interface EmptyRegionStateProps {
  region: RegionFilter
  message?: string
  className?: string
}

export function EmptyRegionState({ region, message, className }: EmptyRegionStateProps) {
  const regionLabel = region === 'kr' ? '국내' : region === 'global' ? '해외' : ''
  const defaultMessage =
    regionLabel.length > 0
      ? `${regionLabel} region에 표시할 데이터가 없습니다.`
      : '표시할 데이터가 없습니다.'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 px-6 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="inline-flex h-12 w-12 items-center justify-center border border-border-subtle bg-surface-1 mb-4"
      >
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="eyebrow mb-2">No data</p>
      <p className="font-display text-base sm:text-lg font-semibold text-foreground">
        {message ?? defaultMessage}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">다른 region을 선택해 보세요.</p>
    </div>
  )
}
