/**
 * 전문가용 헤드라인 카드 (B 섹션 1건).
 */
import { TickerChip } from './ticker-chip'
import type { HeadlineItem } from '@/drizzle/supabase-schema'

interface HeadlineCardProps {
  item: HeadlineItem
}

export function HeadlineCard({ item }: HeadlineCardProps) {
  return (
    <article
      aria-labelledby={`headline-${item.index}-title`}
      className="rounded-2xl border border-border-subtle bg-surface-1 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold tabular-nums"
          aria-hidden
        >
          {item.index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center text-[10px] font-medium text-primary uppercase tracking-wide bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
              {item.category}
            </span>
            {item.tickers.map((t) => (
              <TickerChip key={`${t.symbol}-${t.exchange ?? ''}`} ticker={t} />
            ))}
          </div>
          <h3
            id={`headline-${item.index}-title`}
            className="text-base sm:text-lg font-bold text-card-foreground leading-tight tracking-tight"
          >
            {item.title}
          </h3>
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">
            핵심
          </dt>
          <dd className="text-foreground/90 leading-relaxed">{item.core}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">
            포인트
          </dt>
          <dd className="text-foreground/90 leading-relaxed">{item.point}</dd>
        </div>
      </dl>

      {item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.keywords.map((kw) => (
            <span
              key={kw}
              className="text-[11px] text-muted-foreground rounded-md border border-border-subtle bg-surface-2 px-2 py-0.5"
            >
              #{kw}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
