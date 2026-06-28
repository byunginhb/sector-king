'use client'

import { Sparkles } from 'lucide-react'
import type { RankingItem } from '@/app/api/rankings/route'
import { PICK_PROFILE_META, type PickProfile } from '@/lib/pick-profile'
import { cn } from '@/lib/utils'
import { RecommendationBadge } from './recommendation-badge'
import { InfoTip } from './info-tip'
import { PickProfileToggle } from './pick-profile-toggle'

interface TopPicksProps {
  items: RankingItem[]
  onSelect: (ticker: string) => void
  /** 선택된 투자 성향 — 픽 가중치·표시 점수를 결정. */
  profile: PickProfile
  onProfileChange: (next: PickProfile) => void
}

/**
 * 섹터킹 픽 TOP 5 — 성향(단기/균형/장기) 가중 종합점수 상위 5종.
 * 성향 세그먼티드 컨트롤로 가중치를 바꾸면 픽이 즉시 달라진다(서버가 세 프로필 모두 산출).
 */
export function TopPicks({ items, onSelect, profile, onProfileChange }: TopPicksProps) {
  if (items.length === 0) return null

  return (
    <section className="mb-6" aria-label="섹터킹 픽 — 성향별 종합 점수 상위 종목">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">섹터킹 픽 TOP 5</h2>
          <InfoTip
            label="섹터킹 픽"
            text="단기·장기·DCF 점수를 투자 성향별 가중치로 합쳐 가장 높은 5종이에요. 위 버튼으로 성향을 바꾸면 가중치가 달라집니다. 정렬·필터와 무관하게 전체에서 골라요."
          />
        </div>
        <PickProfileToggle value={profile} onChange={onProfileChange} />
      </div>

      {/* 선택한 성향이 어떤 투자자인지 설명 */}
      <p className="mb-3 text-xs text-muted-foreground">{PICK_PROFILE_META[profile].description}</p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, idx) => {
            const rank = idx + 1
            const name = item.nameKo ?? item.name ?? item.ticker
            const pick = item.pickScores[profile]
            const combined = pick == null ? null : Math.round(pick)

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

                  {/* 픽을 구성하는 세 점수 — 가중치의 출처를 투명하게 */}
                  <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-border-subtle/70 pt-2 num-mono text-[11px]">
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
                    <span className="text-muted-foreground">
                      DCF{' '}
                      <span className="text-foreground">
                        {item.dcfScore == null ? '—' : Math.round(item.dcfScore)}
                      </span>
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
