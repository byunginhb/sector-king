'use client'

import { Sparkles, Calculator } from 'lucide-react'
import type { RankingItem } from '@/app/api/rankings/route'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RecommendationBadge } from './recommendation-badge'
import { InfoTip } from './info-tip'

interface TopPicksProps {
  items: RankingItem[]
  onSelect: (ticker: string) => void
  /** DCF 점수까지 합산해 선정·표시할지 여부. */
  includeDcf: boolean
  /** DCF 포함 토글 핸들러. */
  onToggleDcf: () => void
}

/** 단기·장기(·DCF) 종합 점수 상위 5종 — 상단 하이라이트 카드 스트립. */
export function TopPicks({ items, onSelect, includeDcf, onToggleDcf }: TopPicksProps) {
  if (items.length === 0) return null

  return (
    <section className="mb-6" aria-label="단기·장기 종합 점수 상위 종목">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">섹터킹 종합 픽 TOP 5</h2>
          <InfoTip
            label="종합 픽"
            text={
              includeDcf
                ? '단기·장기 점수에 DCF 점수까지 합쳐 가장 균형 있게 높은 종목 5개입니다. 정렬·필터와 상관없이 전체에서 골라요.'
                : '단기 점수와 장기 점수를 합쳐 가장 균형 있게 높은 종목 5개입니다. 정렬·필터와 상관없이 전체에서 골라요.'
            }
          />
        </div>
        <button
          type="button"
          onClick={onToggleDcf}
          aria-pressed={includeDcf}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
            includeDcf
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border-subtle text-muted-foreground hover:bg-surface-2 hover:text-foreground'
          )}
        >
          <Calculator className="h-3.5 w-3.5" aria-hidden />
          DCF 포함
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, idx) => {
          const rank = idx + 1
          const name = item.nameKo ?? item.name ?? item.ticker
          const combinedRaw = includeDcf ? item.combinedScoreWithDcf : item.combinedScore
          const combined = combinedRaw == null ? null : Math.round(combinedRaw)
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
                  <span className="text-[11px] text-muted-foreground">
                    {includeDcf ? '종합점수(DCF 포함)' : '종합점수'}
                  </span>
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
                  {includeDcf ? (
                    <span className="text-muted-foreground">
                      DCF{' '}
                      <span className="text-foreground">
                        {item.dcfScore == null ? '—' : Math.round(item.dcfScore)}
                      </span>
                    </span>
                  ) : (
                    <span className={cn(upTone)}>
                      {item.upsidePct != null ? formatPercent(item.upsidePct) : 'N/A'}
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
