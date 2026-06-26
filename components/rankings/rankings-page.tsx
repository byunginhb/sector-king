'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Trophy, SearchX } from 'lucide-react'
import { useRankings, type RankingSortKey } from '@/hooks/use-rankings'
import { useRegion } from '@/hooks/use-region'
import type { RankingHorizon, RankingSortDir } from '@/lib/api-helpers'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { IndustryContextBar } from '@/components/layout/industry-context-bar'
import { IndustryTitle } from '@/components/industry-title'
import { RegionToggle } from '@/components/region-toggle'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CompanyDetail } from '@/components/company-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreSortToggle } from './score-sort-toggle'
import { RankingTable } from './ranking-table'
import { RankingCardList } from './ranking-card-list'
import { InfoTip } from './info-tip'

interface RankingsPageProps {
  industryId: string
}

export function RankingsPage({ industryId }: RankingsPageProps) {
  const { region, setRegion } = useRegion()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL ?sort= 로 부각 점수축 동기화(기본 long)
  const horizon: RankingHorizon =
    searchParams.get('sort') === 'short' ? 'short' : 'long'

  // 다축 정렬 상태(헤더 클릭). 기본은 horizon 점수.
  const [sortKey, setSortKey] = useState<RankingSortKey>(horizon)
  const [sortDir, setSortDir] = useState<RankingSortDir>('desc')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const { data, isLoading, isError } = useRankings({
    industryId,
    region,
    horizon,
    sortKey,
    sort: sortDir,
    limit: 100,
  })

  const setHorizon = useCallback(
    (next: RankingHorizon) => {
      // URL 동기화
      const sp = new URLSearchParams(searchParams.toString())
      if (next === 'long') sp.delete('sort')
      else sp.set('sort', next)
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      // 토글 변경 시 정렬도 해당 점수로 되돌린다(진입 직후엔 토글=정렬 컬럼)
      setSortKey(next)
      setSortDir('desc')
    },
    [pathname, router, searchParams]
  )

  const handleSort = useCallback(
    (key: RankingSortKey) => {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          // 같은 컬럼 재클릭 → 방향 토글
          setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
          return key
        }
        // 새 컬럼 → 종목명은 asc 기본, 그 외 desc 기본
        setSortDir(key === 'name' ? 'asc' : 'desc')
        return key
      })
    },
    []
  )

  const items = useMemo(() => data?.items ?? [], [data])

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        shareTitle="점수 랭킹 | Sector King"
        shareDescription="단기·장기 점수로 보는 종목 랭킹"
        subtitle={
          <span>
            <IndustryTitle industryId={industryId} /> 점수 랭킹
          </span>
        }
      />
      <IndustryContextBar
        industryId={industryId}
        rightActions={
          <>
            <ScoreSortToggle value={horizon} onChange={setHorizon} />
            <RegionToggle value={region} onChange={setRegion} />
          </>
        }
      />

      <main className="container mx-auto px-4 py-6">
        {/* 제목 + 기준일 + 설명 — Editorial 헤더 */}
        <div className="mb-5 flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-accent mb-1.5 flex items-center gap-1.5">
              <Trophy className="h-3 w-3" aria-hidden />
              점수 랭킹
            </p>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {horizon === 'short' ? '지금 흐름이 좋은 종목' : '오래 묵힐 가치가 큰 종목'}
              <InfoTip
                label="점수 랭킹"
                text="단기는 지금 분위기·흐름, 장기는 오래 묵힐 가치를 0~100점으로 매겨 높은 순으로 줄 세운 표입니다. 종목을 누르면 자세히 볼 수 있어요."
              />
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-foreground/70 sm:text-sm">
              {horizon === 'short'
                ? '최근 주가 흐름·심리가 좋은 순서입니다. 짧게 보고 들어갈 종목을 찾을 때 참고하세요.'
                : '수익성·성장·규모가 단단한 순서입니다. 길게 묵힐 종목을 고를 때 참고하세요.'}
            </p>
          </div>
          {data?.date && (
            <p className="shrink-0 num-mono text-xs text-muted-foreground tabular-nums">
              {data.date} 기준
            </p>
          )}
        </div>

        {isError && (
          <div className="sk-card flex flex-col items-center gap-2 py-10 text-center">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">랭킹을 불러오지 못했어요</p>
            <p className="text-xs text-muted-foreground">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
        )}

        {isLoading && !data && <RankingsSkeleton />}

        {!isLoading && data && items.length === 0 && (
          <div className="sk-card flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">아직 점수가 매겨진 종목이 없어요</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              지금 고른 산업·지역 조건에 맞는 종목이 없습니다. 조건을 넓혀 보세요.
            </p>
            {region !== 'all' && (
              <button
                type="button"
                onClick={() => setRegion('all')}
                className="mt-1 text-sm font-medium text-primary hover:underline"
              >
                전체 지역으로 보기
              </button>
            )}
          </div>
        )}

        {data && items.length > 0 && (
          <>
            {/* 데스크탑 표 */}
            <div className="hidden sm:block">
              <RankingTable
                items={items}
                horizon={horizon}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onRowClick={setSelectedTicker}
              />
            </div>
            {/* 모바일 카드 */}
            <div className="sm:hidden">
              <RankingCardList
                items={items}
                horizon={horizon}
                onCardClick={setSelectedTicker}
              />
            </div>
          </>
        )}
      </main>

      <Dialog
        open={!!selectedTicker}
        onOpenChange={(open) => !open && setSelectedTicker(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicker && <CompanyDetail ticker={selectedTicker} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RankingsSkeleton() {
  return (
    <div>
      {/* 데스크탑 표 골격 */}
      <div className="hidden overflow-hidden rounded-md border border-border-subtle sm:block">
        <div className="border-b border-border bg-surface-1 px-3 py-2.5">
          <Skeleton className="h-3.5 w-1/3" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border-subtle/70 px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-5 shrink-0" />
            <Skeleton className="h-4 w-32 shrink-0" />
            <Skeleton className="h-2 flex-1 max-w-[88px]" />
            <Skeleton className="h-2 flex-1 max-w-[88px]" />
            <Skeleton className="ml-auto h-5 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
      {/* 모바일 카드 골격 */}
      <div className="space-y-2 sm:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk-card space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
