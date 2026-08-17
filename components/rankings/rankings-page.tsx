'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Trophy, SearchX, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRankings, type RankingSortKey } from '@/hooks/use-rankings'
import type { PickProfile } from '@/lib/pick-profile'
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
import { RankingScreener } from './ranking-screener'
import {
  applyFilter,
  EMPTY_FILTER,
  hasAnyCondition,
  type RankingFilterState,
} from '@/lib/ranking-filter'
import { formatRecommendation } from '@/lib/format'
import { DataAsOf } from '@/components/ui/data-as-of'

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
  /** 섹터킹 픽 투자 성향(단기/균형/장기) — 가중치 결정. 클라이언트 전환, 재요청 없음. */
  const [pickProfile, setPickProfile] = useState<PickProfile>('balanced')

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

  const allItems = useMemo(() => data?.items ?? [], [data])

  /**
   * 조건 스크리너 — 정렬은 순서만 바꾸고 개수를 줄이지 못한다. 조건을 겹쳐
   * 좁히는 것이 실제로 종목을 추리는 방식이다(#40).
   *
   * URL 에 싣지 않는다: 조건이 여덟 필드 × 최소/최대라 쿼리스트링이 금세
   * 읽을 수 없게 길어지고, 이 화면은 이미 `sort`·`region` 을 URL 로 쓰고 있어
   * 섞이면 어느 것이 무엇인지 구분이 안 된다. 공유가 필요해지면 조건 묶음에
   * 짧은 키를 붙이는 별도 작업으로 다룬다.
   */
  const [filter, setFilter] = useState<RankingFilterState>(EMPTY_FILTER)

  const items = useMemo(() => applyFilter(allItems, filter), [allItems, filter])

  /** 필터 선택지는 **필터 이전** 목록에서 뽑는다 — 고르는 순간 사라지지 않게. */
  const sectorOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>()
    for (const i of allItems) {
      if (!i.sector) continue
      const cur = counts.get(i.sector.sectorId)
      if (cur) cur.count += 1
      else counts.set(i.sector.sectorId, { id: i.sector.sectorId, name: i.sector.sectorName, count: 1 })
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
  }, [allItems])

  const recommendationOptions = useMemo(() => {
    const set = new Set<string>()
    for (const i of allItems) {
      if (i.recommendationKey && i.recommendationKey !== 'none') set.add(i.recommendationKey)
    }
    return [...set].sort()
  }, [allItems])

  const toolbar = (
    <>
      <ScoreSortToggle value={horizon} onChange={setHorizon} />
      <RegionToggle value={region} onChange={setRegion} />
    </>
  )

  return (
    <div className="min-h-screen">
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
            <DataAsOf date={data?.date} label="점수" />
          </div>
        </div>

        {/*
          섹터킹 픽 — 성향별 가중 종합 점수 상위 5.

          **조건 필터가 걸리면 감춘다.** 픽은 조건과 무관하게 전체에서 뽑히는
          별도 코너인데, 아래 표만 4종목으로 좁혀진 상태에서 조건에 맞지 않는
          픽 5개가 그 위에 남아 있으면 "필터가 안 걸렸나" 또는 "이게 조건을
          통과한 픽인가"로 읽힌다. 픽에 필터를 적용하지 않는 이유는 그러면
          "섹터킹 픽"이 조건마다 달라지는 다른 지표가 되기 때문이다.
        */}
        {!hasAnyCondition(filter) && (
          <TopPicks
            items={data?.topPicksByProfile?.[pickProfile] ?? []}
            onSelect={setSelectedTicker}
            profile={pickProfile}
            onProfileChange={setPickProfile}
          />
        )}

        {/* 점수 산출 방식 안내 — 초보자용, 기본 접힘 */}
        <details className="mb-5 sk-card/50 px-4 py-3 text-sm">
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
            <p>
              <span className="font-semibold text-foreground">가치 점수</span>는 회사가 벌어들일
              현금을 추정해 &lsquo;지금 주가가 적정한지&rsquo;를 봅니다. 미래 성장·할인율 가정이
              들어가 가정이 바뀌면 결과도 크게 달라집니다. &lsquo;상승예측 %&rsquo;는 미래 주가를
              약속하지 않는 참고치입니다.
            </p>
            <p className="text-xs text-muted-foreground">
              빠르게 성장하거나 인기가 많아 현재 이익 대비 비싸게 거래되는 종목(예: 대표
              AI·반도체주)은 가치 점수가 낮게 나오는 경향이 있습니다. 보수적으로 계산하기
              때문이며, <span className="text-foreground">장기 점수는 높은데 가치 점수가 낮다면</span>{' '}
              &lsquo;좋은 기업이지만 성장 기대가 주가에 이미 반영된 상태&rsquo;로 읽으면 됩니다.
            </p>
            <p className="text-xs text-muted-foreground">
              단기·장기 점수는 종목 상세 화면에서도 똑같은 기준으로 보여요. 투자 권유가 아니라
              참고용 정보입니다.
            </p>
            <Link
              href="/methodology#ranking-scores"
              className="inline-flex text-xs font-medium text-info hover:underline"
            >
              점수 계산 방법 자세히 보기 →
            </Link>
          </div>
        </details>

        {isError && (
          <div className="sk-card flex flex-col items-center gap-2 py-10 text-center p-5">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">랭킹을 불러오지 못했어요</p>
            <p className="text-xs text-muted-foreground">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
        )}

        {isLoading && !data && <RankingsSkeleton />}

        {/* 스크리너는 결과가 0건이어도 남는다 — 조건 때문에 비었다면 여기서 푼다. */}
        {data && (
          <div className="mb-3">
            <RankingScreener
              filter={filter}
              onChange={setFilter}
              sectors={sectorOptions}
              recommendations={recommendationOptions}
              recommendationLabel={formatRecommendation}
              matchedCount={items.length}
              totalCount={allItems.length}
            />
          </div>
        )}

        {!isLoading && data && items.length === 0 && (
          <div className="sk-card flex flex-col items-center gap-2 py-12 text-center p-5">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            {hasAnyCondition(filter) ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  조건에 맞는 종목이 없어요
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  건 조건을 모두 만족하는 종목이 {allItems.length.toLocaleString()}개 중
                  0개입니다. 조건 하나를 빼거나 기준을 낮춰 보세요.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter(EMPTY_FILTER)}
                  className="mt-1 text-sm font-medium text-primary hover:underline"
                >
                  조건 전체 초기화
                </button>
              </>
            ) : (
              <>
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
              </>
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
          <div key={i} className="sk-card space-y-3 p-5">
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
