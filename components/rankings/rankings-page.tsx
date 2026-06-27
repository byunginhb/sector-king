'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Trophy, SearchX, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRankings, type RankingSortKey } from '@/hooks/use-rankings'
import type { RankingsResponse } from '@/app/api/rankings/route'
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
import { TopPicks } from './top-picks'
import { RankingTable } from './ranking-table'
import { RankingCardList } from './ranking-card-list'
import { InfoTip } from './info-tip'

interface RankingsPageProps {
  /** 산업 스코프. 생략하면 전 종목(섹터킹 픽 전역 랭킹). */
  industryId?: string
  /** SSR 초기 데이터(기본 뷰 = region all·장기 점수 desc). 크롤러·AI 가 본문을 읽게 한다. */
  initialData?: RankingsResponse
}

export function RankingsPage({ industryId, initialData }: RankingsPageProps) {
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
  const [showAdvanced, setShowAdvanced] = useState(false)

  // SSR 초기 데이터는 "기본 뷰"(전체 지역·장기 점수 desc·limit 100)에만 적용한다.
  // 사용자가 지역/점수축/정렬을 바꾸면 queryKey 가 달라져 정상적으로 재요청된다.
  const isDefaultView =
    region === 'all' && horizon === 'long' && sortKey === 'long' && sortDir === 'desc'

  const { data, isLoading, isError } = useRankings({
    industryId,
    region,
    horizon,
    sortKey,
    sort: sortDir,
    limit: 100,
    initialData: isDefaultView ? initialData : undefined,
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

  const toolbar = (
    <>
      <ScoreSortToggle value={horizon} onChange={setHorizon} />
      <RegionToggle value={region} onChange={setRegion} />
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        shareTitle="점수 랭킹 | Sector King"
        shareDescription="단기·장기 점수로 보는 종목 랭킹"
        subtitle={
          industryId ? (
            <span>
              <IndustryTitle industryId={industryId} /> 점수 랭킹
            </span>
          ) : (
            <span>섹터킹 픽 · 전 종목 점수 랭킹</span>
          )
        }
      />
      {industryId ? (
        <IndustryContextBar industryId={industryId} rightActions={toolbar} />
      ) : (
        <div className="border-b border-border-subtle bg-surface-1/50">
          <div className="container mx-auto flex flex-wrap items-center justify-end gap-2 px-4 py-2 sm:gap-3">
            {toolbar}
          </div>
        </div>
      )}

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
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              aria-pressed={showAdvanced}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                showAdvanced
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border-subtle text-muted-foreground hover:bg-surface-2 hover:text-foreground'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              추가 지표
            </button>
            {data?.date && (
              <p className="num-mono text-xs text-muted-foreground tabular-nums">
                {data.date} 기준
              </p>
            )}
          </div>
        </div>

        {/* 단기·장기 종합 점수 상위 5 — 상단 하이라이트 */}
        <TopPicks items={data?.topPicks ?? []} onSelect={setSelectedTicker} />

        {/* 점수 산출 방식 안내 — 초보자용, 기본 접힘 */}
        <details className="mb-5 rounded-md border border-border-subtle bg-surface-1/50 px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none font-medium text-foreground">
            단기·장기 점수는 어떻게 매기나요?
          </summary>
          <div className="mt-3 space-y-2 text-foreground/80">
            <p>
              <span className="font-semibold text-foreground">단기 점수</span>는 &lsquo;지금
              분위기·흐름&rsquo;을 봅니다. 최근 점수가 오르고 있는지, 52주 가격 범위에서 지금
              어디쯤인지, 시장 심리는 어떤지를 모아 0~100점으로 매깁니다.
            </p>
            <p>
              <span className="font-semibold text-foreground">장기 점수</span>는 &lsquo;오래 묵힐
              가치&rsquo;를 봅니다. 얼마나 잘 버는지(수익성), 얼마나 성장하는지, 회사 규모는 큰지,
              목표가까지 오를 여력은 있는지를 모아 0~100점으로 매깁니다.
            </p>
            <p className="text-xs text-muted-foreground">
              두 점수는 종목 상세 화면에서도 똑같은 기준으로 보여요. 투자 권유가 아니라 참고용
              정보입니다.
            </p>
          </div>
        </details>

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
                showAdvanced={showAdvanced}
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
