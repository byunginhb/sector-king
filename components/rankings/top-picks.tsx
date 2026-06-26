'use client'

import { Sparkles } from 'lucide-react'
import type { RankingItem } from '@/app/api/rankings/route'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RecommendationBadge } from './recommendation-badge'
import { InfoTip } from './info-tip'

interface TopPicksProps {
  items: RankingItem[]
  onSelect: (ticker: string) => void
}

/** 단기·장기 종합 점수 상위 5종 — 상단 하이라이트 카드 스트립. */
export function TopPicks({ items, onSelect }: TopPicksProps) {
  if (items.length === 0) return null

  return (
    <section className="mb-6" aria-label="단기·장기 종합 점수 상위 종목">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">섹터킹 종합 픽 TOP 5</h2>
        <InfoTip
          label="종합 픽"
          text="단기 점수와 장기 점수를 합쳐 가장 균형 있게 높은 종목 5개입니다. 정렬·필터와 상관없이 전체에서 골라요."
        />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, idx) => {
          const rank = idx + 1
          const name = item.nameKo ?? item.name ?? item.ticker
          const combined =
            item.combinedScore == null ? null : Math.round(item.combinedScore)
          const upTone =
            item.upsidePct == null
              ? 'text-muted-foreground'
              : item.upsidePct >= 0
                ? 'text-success'
                : 'text-danger'

          return (
            <li key={item.ticker}>
              <button
                type="button"
                onClick={() => onSelect(item.ticker)}
                className="sk-card sk-card-hover flex h-full w-full flex-col gap-2 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="num-mono text-xs font-bold text-primary">#{rank}</span>
                  <RecommendationBadge
                    recommendationKey={item.recommendationKey}
                    analystCount={item.analystCount}
                  />
                </div>

                <div className="min-w-0">
                  <span className="block truncate font-semibold leading-tight text-foreground">
                    {name}
                  </span>
                  <span className="num-mono block text-[11px] text-muted-foreground">
                    {item.ticker}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="num-mono text-2xl font-bold tabular-nums text-foreground">
                    {combined ?? '—'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">종합점수</span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle/70 pt-2 num-mono text-[11px]">
                  <span className="text-muted-foreground">
                    단기{' '}
                    <span className="text-foreground">
                      {item.shortScore == null ? '—' : Math.round(item.shortScore)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    장기{' '}
                    <span className="text-foreground">
                      {item.longScore == null ? '—' : Math.round(item.longScore)}
                    </span>
                  </span>
                  <span className={cn(upTone)}>
                    {item.upsidePct != null ? formatPercent(item.upsidePct) : 'N/A'}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
