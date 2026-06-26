'use client'

import type { RankingItem } from '@/app/api/rankings/route'
import type { RankingHorizon } from '@/lib/api-helpers'
import { useCurrencyFormat } from '@/hooks/use-currency-format'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ScoreBar } from './score-bar'
import { RecommendationBadge } from './recommendation-badge'

interface RankingCardListProps {
  items: RankingItem[]
  horizon: RankingHorizon
  onCardClick: (ticker: string) => void
}

/**
 * 모바일(<sm) 랭킹 카드 리스트. 표를 가로 스크롤로 욱여넣지 않는다.
 * 토글이 부각하는 점수를 먼저·강조 배치한다.
 */
export function RankingCardList({ items, horizon, onCardClick }: RankingCardListProps) {
  const fmt = useCurrencyFormat()

  return (
    <ul className="space-y-2">
      {items.map((item, idx) => {
        const rank = idx + 1
        const isTop3 = rank <= 3
        const displayName = item.nameKo ?? item.name ?? item.ticker
        const upTone =
          item.upsidePct == null
            ? 'text-muted-foreground'
            : item.upsidePct >= 0
              ? 'text-success'
              : 'text-danger'

        // 토글 선택값에 따라 점수 배치 순서 결정
        const primary =
          horizon === 'short'
            ? { score: item.shortScore, label: '단기' }
            : { score: item.longScore, label: '장기' }
        const secondary =
          horizon === 'short'
            ? { score: item.longScore, label: '장기' }
            : { score: item.shortScore, label: '단기' }

        return (
          <li key={item.ticker}>
            <button
              type="button"
              onClick={() => onCardClick(item.ticker)}
              className={cn(
                'sk-card w-full text-left transition-colors hover:bg-surface-2',
                isTop3 && 'border-l-2 border-l-primary/40'
              )}
            >
              {/* 헤더: 순위·종목 + 투자의견 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span
                    className={cn(
                      'num-mono shrink-0 tabular-nums',
                      isTop3 ? 'text-base font-bold text-primary' : 'text-sm text-muted-foreground'
                    )}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <span className="block font-semibold leading-tight text-foreground line-clamp-1">
                      {displayName}
                    </span>
                    <span className="num-mono mt-0.5 block text-[11px] text-muted-foreground">
                      {item.ticker}
                    </span>
                  </div>
                </div>
                <RecommendationBadge
                  recommendationKey={item.recommendationKey}
                  analystCount={item.analystCount}
                />
              </div>

              {/* 점수 2종 — 선택된 토글 점수를 amber 박스로 부각 */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2">
                  <span className="eyebrow eyebrow-accent mb-1.5 block">{primary.label} 점수</span>
                  <ScoreBar score={primary.score} emphasized label={`${primary.label} 점수`} />
                </div>
                <div className="rounded-md border border-border-subtle px-2.5 py-2">
                  <span className="eyebrow mb-1.5 block">{secondary.label} 점수</span>
                  <ScoreBar score={secondary.score} label={`${secondary.label} 점수`} />
                </div>
              </div>

              {/* 목표주가·상승여력 + 재무 */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-subtle/70 pt-2.5 text-xs">
                <span className="text-muted-foreground">
                  목표주가{' '}
                  <span className="num-mono text-foreground">
                    {item.targetMeanPriceUsd != null ? fmt.price(item.targetMeanPriceUsd) : 'N/A'}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  현재가{' '}
                  <span className="num-mono text-foreground">
                    {item.priceUsd != null ? fmt.price(item.priceUsd) : 'N/A'}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  상승여력{' '}
                  <span className={cn('num-mono', upTone)}>
                    {item.upsidePct != null ? formatPercent(item.upsidePct) : 'N/A'}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  ROE{' '}
                  <span className="num-mono text-foreground">
                    {item.returnOnEquity != null ? formatPercent(item.returnOnEquity) : 'N/A'}
                  </span>
                </span>
              </div>

              {item.momentumPartial && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  추세 데이터가 짧아요(상장 초기 종목)
                </p>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
