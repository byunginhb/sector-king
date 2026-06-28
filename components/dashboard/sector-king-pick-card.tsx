'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useRankings } from '@/hooks/use-rankings'
import { SectionHeader } from '@/components/ui/section-header'
import type { RegionFilter } from '@/types'

interface SectorKingPickCardProps {
  region: RegionFilter
}

/**
 * 메인 대시보드용 섹터킹 픽 카드 — 균형 성향 TOP 5 요약.
 * 종목을 누르면 상세 페이지로, "자세히 보기"는 /rankings(성향 전환·전체 표)로 이동.
 * 픽은 limit 과 무관하게 전체 후보에서 선정되므로 payload 절약 위해 limit=5.
 */
export function SectorKingPickCard({ region }: SectorKingPickCardProps) {
  const { data, isLoading } = useRankings({ region, limit: 5 })

  if (isLoading) return null
  const picks = data?.topPicksByProfile?.balanced ?? []
  if (picks.length === 0) return null

  return (
    <section className="mt-8" aria-label="섹터킹 픽">
      <SectionHeader
        eyebrow="Sector King Picks"
        title="섹터킹 픽 TOP 5"
        description="단기·장기·DCF를 종합한 균형 추천 — 종목을 누르면 상세로 이동"
      />

      <div className="rounded-2xl border border-border-subtle bg-surface-1 overflow-hidden">
        <ul className="divide-y divide-border-subtle">
          {picks.map((p, idx) => {
            const name = p.nameKo ?? p.name ?? p.ticker
            const score = p.pickScores.balanced
            return (
              <li key={p.ticker}>
                <Link
                  href={`/stock/${p.ticker}`}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <span className="num-mono w-6 shrink-0 text-xs tabular-nums text-muted-foreground/80">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                        {name}
                      </span>
                      <span className="num-mono text-[11px] text-muted-foreground">{p.ticker}</span>
                    </div>
                    <div className="num-mono mt-1 flex items-center gap-2.5 text-[11px]">
                      <span className="text-muted-foreground">
                        단기{' '}
                        <span className="font-medium text-foreground">
                          {p.shortScore == null ? '—' : Math.round(p.shortScore)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        장기{' '}
                        <span className="font-medium text-foreground">
                          {p.longScore == null ? '—' : Math.round(p.longScore)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        가치{' '}
                        <span className="font-medium text-foreground">
                          {p.dcfScore == null ? '—' : Math.round(p.dcfScore)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <span className="num-mono text-xl font-bold leading-none tabular-nums text-foreground">
                      {score == null ? '—' : Math.round(score)}
                    </span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">종합점수</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-2/40 px-4 py-3 sm:px-5">
          <p className="text-[11px] text-muted-foreground">성향(단기·균형·장기)별로 더 볼 수 있어요</p>
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            자세히 보기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
