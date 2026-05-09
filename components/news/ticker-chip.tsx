/**
 * 헤드라인/액션에서 사용하는 티커 칩.
 * - industryId 가 있으면 `/{industryId}` 라우팅 (Link)
 * - 없으면 비활성 (텍스트만)
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { TickerRef } from '@/drizzle/supabase-schema'

interface TickerChipProps {
  ticker: TickerRef
  className?: string
}

export function TickerChip({ ticker, className }: TickerChipProps) {
  const label = ticker.symbol
  const sub = ticker.name ? ` ${ticker.name}` : ''

  if (ticker.industryId) {
    return (
      <Link
        href={`/${ticker.industryId}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-primary hover:bg-primary/20 transition-colors',
          className
        )}
      >
        {label}
        {sub && <span className="font-sans font-normal text-foreground/70">{sub}</span>}
      </Link>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-muted-foreground',
        className
      )}
    >
      {label}
      {sub && <span className="font-sans font-normal text-foreground/60">{sub}</span>}
    </span>
  )
}
