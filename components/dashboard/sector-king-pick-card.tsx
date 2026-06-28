'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useRankings } from '@/hooks/use-rankings'
import { SectionHeader } from '@/components/ui/section-header'
import { ScoreBar } from '@/components/rankings/score-bar'
import type { RegionFilter } from '@/types'

interface SectorKingPickCardProps {
  region: RegionFilter
}

/**
 * 메인 대시보드용 섹터킹 픽 카드 — 균형 성향 TOP 5.
 * 단기·장기·가치·종합을 컬럼 + progressbar 로 표현(데스크탑=표, 모바일=막대 카드).
 * 행 클릭 시 종목 상세 페이지로, "자세히 보기"는 /rankings(성향 전환·전체 표)로 이동.
 * 픽은 limit 과 무관하게 전체 후보에서 선정되므로 payload 절약 위해 limit=5.
 */
export function SectorKingPickCard({ region }: SectorKingPickCardProps) {
  const router = useRouter()
  const { data, isLoading } = useRankings({ region, limit: 5 })

  if (isLoading) return null
  const picks = data?.topPicksByProfile?.balanced ?? []
  if (picks.length === 0) return null

  return (
    <section className="mt-8" aria-label="섹터킹 픽">
      <SectionHeader
        eyebrow="Sector King Picks"
        title="섹터킹 픽 TOP 5"
        description="단기·장기·가치를 종합한 균형 추천 — 종목을 누르면 상세로 이동"
      />

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {/* 데스크탑: 컬럼 + progressbar 표 */}
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              섹터킹 픽 TOP 5 — 순위, 종목, 단기·장기·가치 점수와 종합점수를 막대로 표시합니다.
            </caption>
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2/40 text-xs font-medium text-muted-foreground">
                <th scope="col" className="w-10 px-4 py-2.5 text-center">
                  #
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  종목
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  단기
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  장기
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  가치
                </th>
                <th scope="col" className="bg-primary/5 px-4 py-2.5 text-left">
                  종합점수
                </th>
              </tr>
            </thead>
            <tbody>
              {picks.map((item, idx) => {
                const name = item.nameKo ?? item.name ?? item.ticker
                return (
                  <tr
                    key={item.ticker}
                    onClick={() => router.push(`/stock/${item.ticker}`)}
                    className="group cursor-pointer border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="num-mono text-sm font-bold tabular-nums text-primary">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/stock/${item.ticker}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="block font-semibold leading-tight text-foreground line-clamp-1">
                          {name}
                        </span>
                        <span className="num-mono mt-0.5 block text-[11px] text-muted-foreground">
                          {item.ticker}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={item.shortScore} label="단기 점수" />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={item.longScore} label="장기 점수" />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={item.dcfScore} label="가치 점수" />
                    </td>
                    <td className="bg-primary/5 px-4 py-3">
                      <ScoreBar score={item.pickScores.balanced} emphasized label="종합점수" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 모바일: 막대가 있는 카드 리스트 */}
        <ul className="divide-y divide-border-subtle sm:hidden">
          {picks.map((item, idx) => {
            const name = item.nameKo ?? item.name ?? item.ticker
            const pick = item.pickScores.balanced
            return (
              <li key={item.ticker}>
                <Link
                  href={`/stock/${item.ticker}`}
                  className="block px-4 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="num-mono shrink-0 text-sm font-bold tabular-nums text-primary">
                        {idx + 1}
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

                  <div className="mt-3 space-y-1.5">
                    <MobileScoreRow label="단기" score={item.shortScore} />
                    <MobileScoreRow label="장기" score={item.longScore} />
                    <MobileScoreRow label="가치" score={item.dcfScore} />
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

/** 모바일 카드용 라벨 + 막대 한 줄. */
function MobileScoreRow({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <ScoreBar score={score} label={`${label} 점수`} className="flex-1" />
    </div>
  )
}
