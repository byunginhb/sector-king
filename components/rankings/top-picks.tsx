'use client'

import { Sparkles } from 'lucide-react'
import type { RankingItem } from '@/app/api/rankings/route'
import { PICK_PROFILE_META, type PickProfile } from '@/lib/pick-profile'
import { cn } from '@/lib/utils'
import { ScoreBar } from './score-bar'
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
 * 단기·장기·가치·종합을 컬럼 + progressbar 로 표현(데스크탑=표, 모바일=카드).
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
            text="단기·장기·가치 점수를 투자 성향별 가중치로 합쳐 가장 높은 5종이에요. 위 버튼으로 성향을 바꾸면 가중치가 달라집니다. 정렬·필터와 무관하게 전체에서 골라요."
          />
        </div>
        <PickProfileToggle value={profile} onChange={onProfileChange} />
      </div>

      {/* 선택한 성향이 어떤 투자자인지 설명 */}
      <p className="mb-3 text-xs text-muted-foreground">{PICK_PROFILE_META[profile].description}</p>

      {/* 데스크탑: 컬럼 + progressbar 표 */}
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            섹터킹 픽 TOP 5 — 순위, 종목, 단기·장기·가치 점수와 종합점수를 막대로 표시합니다.
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-1 text-xs font-medium text-muted-foreground">
              <th scope="col" className="w-10 px-3 py-2 text-center">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                종목
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                단기
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                장기
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                가치
              </th>
              <th scope="col" className="bg-primary/5 px-3 py-2 text-left">
                종합점수
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const rank = idx + 1
              const name = item.nameKo ?? item.name ?? item.ticker
              return (
                <tr
                  key={item.ticker}
                  onClick={() => onSelect(item.ticker)}
                  className="group cursor-pointer border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-3 py-2.5 text-center">
                    <span className="num-mono text-sm font-bold tabular-nums text-primary">
                      {rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item.ticker)
                      }}
                      className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="block font-semibold leading-tight text-foreground line-clamp-1">
                        {name}
                      </span>
                      <span className="num-mono mt-0.5 block text-[11px] text-muted-foreground">
                        {item.ticker}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreBar score={item.shortScore} label="단기 점수" />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreBar score={item.longScore} label="장기 점수" />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreBar score={item.dcfScore} label="가치 점수" />
                  </td>
                  <td className="bg-primary/5 px-3 py-2.5">
                    <ScoreBar score={item.pickScores[profile]} emphasized label="종합점수" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 막대가 있는 카드 */}
      <ul className="space-y-2 sm:hidden">
        {items.map((item, idx) => {
          const rank = idx + 1
          const name = item.nameKo ?? item.name ?? item.ticker
          const pick = item.pickScores[profile]
          return (
            <li key={item.ticker}>
              <button
                type="button"
                onClick={() => onSelect(item.ticker)}
                className="sk-card w-full text-left transition-colors hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="num-mono shrink-0 text-sm font-bold tabular-nums text-primary">
                      {rank}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-semibold leading-tight text-foreground line-clamp-1">
                        {name}
                      </span>
                      <span className="num-mono mt-0.5 block text-[11px] text-muted-foreground">
                        {item.ticker}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="num-mono text-xl font-bold leading-none tabular-nums text-foreground">
                      {pick == null ? '—' : Math.round(pick)}
                    </span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">종합점수</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border-subtle/70 pt-2.5">
                  <MobileScoreRow label="단기" score={item.shortScore} />
                  <MobileScoreRow label="장기" score={item.longScore} />
                  <MobileScoreRow label="가치" score={item.dcfScore} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 모바일 카드용 라벨 + 막대 한 줄. */
function MobileScoreRow({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <ScoreBar score={score} label={`${label} 점수`} className={cn('flex-1')} />
    </div>
  )
}
