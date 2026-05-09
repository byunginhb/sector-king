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
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Inbox className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message ?? defaultMessage}</p>
      <p className="text-xs text-muted-foreground mt-1">다른 region을 선택해 보세요.</p>
    </div>
  )
}
