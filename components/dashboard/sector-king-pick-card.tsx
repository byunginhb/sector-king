'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useRankings } from '@/hooks/use-rankings'
import { ScoreBar } from '@/components/rankings/score-bar'
import { PickProfileToggle } from '@/components/rankings/pick-profile-toggle'
import { PICK_PROFILE_META, type PickProfile } from '@/lib/pick-profile'
import { Skeleton } from '@/components/ui/skeleton'
import type { RegionFilter } from '@/types'

interface SectorKingPickCardProps {
  region: RegionFilter
}

/**
 * 메인 대시보드용 섹터킹 픽 카드 — 균형 성향 TOP 5(전폭 1단).
 * 단기·장기·가치·종합을 컬럼 + progressbar 로 표현(데스크탑=표, 모바일=막대 카드).
 * 행 클릭 시 종목 상세 페이지로, "자세히 보기"는 /rankings(성향 전환·전체 표)로 이동.
 * 픽은 limit 과 무관하게 전체 후보에서 선정되므로 payload 절약 위해 limit=5.
 */
export function SectorKingPickCard({ region }: SectorKingPickCardProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<PickProfile>('balanced')
  const { data, isLoading } = useRankings({ region, limit: 5 })

  if (isLoading) return <SectorKingPickCardSkeleton />
  const picks = (data?.topPicksByProfile?.[profile] ?? []).slice(0, 5)
  if (picks.length === 0) return null

  return (
    <section aria-label="섹터킹 픽">
      {/* 헤더 해부구조 — NewsHomeCard 와 동일하게 유지할 것 (홈 TODAY 2열 상단 정렬).
          예전엔 SectionHeader 를 카드 '밖'에 두고 mt-8 까지 붙어 있어서
          카드 안에 헤더를 둔 좌측 컬럼과 시작선이 어긋났다. */}
      <div className="flex h-full flex-col overflow-hidden sk-card">
        <div className="px-5 pb-4 pt-5">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
            <p className="eyebrow eyebrow-accent">Sector King Picks</p>
            <PickProfileToggle value={profile} onChange={setProfile} />
          </div>
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-card-foreground sm:text-xl">
            섹터킹 픽 TOP 5
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {PICK_PROFILE_META[profile].description}
          </p>
        </div>

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
                <th scope="col" className="whitespace-nowrap px-4 py-2.5 text-left">
                  가치(DCF)
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
                      <ScoreBar score={item.pickScores[profile]} emphasized label="종합점수" />
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
            const pick = item.pickScores[profile]
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
                    <MobileScoreRow label="가치(DCF)" score={item.dcfScore} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-2/40 px-4 py-3 sm:px-5">
          <p className="text-[11px] text-muted-foreground">전체 순위·정렬·재무 지표는 랭킹에서</p>
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
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <ScoreBar score={score} label={`${label} 점수`} className="flex-1" />
    </div>
  )
}

function SectorKingPickCardSkeleton() {
  return (
    <section aria-label="섹터킹 픽">
      <div className="flex h-full flex-col overflow-hidden sk-card">
        <div className="px-5 pb-4 pt-5">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-1.5" />
        </div>
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
