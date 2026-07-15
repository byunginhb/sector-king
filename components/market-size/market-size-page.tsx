'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, PieChart, TrendingUp, Target, BarChart2, CircleDot, LayoutGrid } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { RegionToggle } from '@/components/region-toggle'
import { SectorCompanyList } from '@/components/money-flow/sector-company-list'
import { useRegion } from '@/hooks/use-region'
import { useIndustries } from '@/hooks/use-industries'
import { useMarketSize } from '@/hooks/use-market-size'
import {
  MarketSizeIndustryMap,
  type IndustryGroup,
} from './market-size-industry-map'
import {
  MarketSizeMetricBars,
  type MetricNode,
} from './market-size-metric-bars'
import {
  MarketSizeBubbleChart,
  type BubbleGroup,
  type BubblePoint,
} from './market-size-bubble-chart'
import { MarketSizeExplainer } from './market-size-explainer'
import { cn } from '@/lib/utils'
import type { MarketSizeCategory, MarketSizeNode } from '@/types'

/** "전체" 뷰에서 표시할 카테고리 상한 (시총 상위). */
const TOP_N = 30

// 버블 산업 색 팔레트 (검정·순빨강 배제 톤). industryId 순서로 배정.
const INDUSTRY_PALETTE = [
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899',
  '#06b6d4', '#84cc16', '#a855f7', '#f97316', '#6366f1',
]
const FALLBACK_COLOR = '#94a3b8'

function toPoint(n: MarketSizeNode): BubblePoint | null {
  if (n.revenueGrowth == null || n.targetUpside == null) return null
  return {
    id: n.id,
    name: n.name,
    x: n.revenueGrowth * 100,
    y: n.targetUpside * 100,
    z: n.marketCap,
    tickerCount: n.tickerCount,
    revenueSum: n.revenueSum,
    revenueWith: n.revenueCoverage.withRevenue,
    revenueTotal: n.revenueCoverage.total,
  }
}

/** PC 전용 뷰 모드 — 막대(기본) / 버블. 모바일은 항상 막대. */
type ViewMode = 'bars' | 'bubble'

export function MarketSizePage() {
  const { region, setRegion } = useRegion()
  const [industryId, setIndustryId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState<{
    id: string
    name: string
  } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('bars')

  const { data: industriesData } = useIndustries({ region })
  const { data, isLoading, isError } = useMarketSize({ region, industryId })

  const categories = useMemo(() => data?.categories ?? [], [data])
  const selectedCategory: MarketSizeCategory | null = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) ?? null
    : null

  // 전체 뷰: 시총 상위 TOP_N (산업 선택 시 전체 노출)
  const shownCategories = useMemo(() => {
    if (industryId) return categories
    return categories.slice(0, TOP_N)
  }, [categories, industryId])

  // 막대·트리맵 공용 소스 — 드릴다운이면 섹터, 아니면 카테고리.
  const metricNodes = useMemo<MetricNode[]>(
    () => (selectedCategory ? selectedCategory.sectors : shownCategories),
    [selectedCategory, shownCategories]
  )
  // 시총 지도 — 산업(그룹) → 섹터(타일). 카테고리의 대표 산업으로 섹터를 모은다.
  // (드릴다운 상태와 무관하게 항상 전체를 보여준다. 좁히려면 상단 산업 셀렉트 사용)
  const industryGroups = useMemo<IndustryGroup[]>(() => {
    const map = new Map<string, IndustryGroup>()
    for (const c of categories) {
      const key = c.industryId ?? 'none'
      const existing = map.get(key)
      const sectors = [...(existing?.sectors ?? []), ...c.sectors]
      map.set(key, {
        id: key,
        name: c.industryName ?? '기타',
        marketCap: sectors.reduce((sum, s) => sum + s.marketCap, 0),
        sectors,
      })
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        sectors: [...g.sectors].sort((a, b) => b.marketCap - a.marketCap),
      }))
      .sort((a, b) => b.marketCap - a.marketCap)
  }, [categories])

  const mapSectorCount = useMemo(
    () => industryGroups.reduce((sum, g) => sum + g.sectors.length, 0),
    [industryGroups]
  )

  // 버블 뷰(PC 전용) — industryId → 색, 산업별 그룹.
  const industryColor = useMemo(() => {
    const map = new Map<string, string>()
    industriesData?.industries.forEach((ind, i) => {
      map.set(ind.id, INDUSTRY_PALETTE[i % INDUSTRY_PALETTE.length])
    })
    return map
  }, [industriesData])

  const { bubbleGroups, excludedCount } = useMemo(() => {
    if (selectedCategory) {
      const color = selectedCategory.industryId
        ? industryColor.get(selectedCategory.industryId) ?? FALLBACK_COLOR
        : FALLBACK_COLOR
      const points = selectedCategory.sectors
        .map(toPoint)
        .filter((p): p is BubblePoint => p !== null)
      return {
        bubbleGroups: [
          { key: 'sectors', label: selectedCategory.name, color, points },
        ] as BubbleGroup[],
        excludedCount: selectedCategory.sectors.length - points.length,
      }
    }
    const byIndustry = new Map<string, BubbleGroup>()
    let excluded = 0
    for (const c of shownCategories) {
      const point = toPoint(c)
      if (!point) {
        excluded += 1
        continue
      }
      const key = c.industryId ?? 'none'
      const color = c.industryId
        ? industryColor.get(c.industryId) ?? FALLBACK_COLOR
        : FALLBACK_COLOR
      const g = byIndustry.get(key) ?? {
        key,
        label: c.industryName ?? '기타',
        color,
        points: [],
      }
      g.points.push(point)
      byIndustry.set(key, g)
    }
    return { bubbleGroups: Array.from(byIndustry.values()), excludedCount: excluded }
  }, [selectedCategory, shownCategories, industryColor])

  // 막대 뷰 — 모바일·PC(막대 모드) 공용. 두 지표 분리 랭킹 막대.
  const barsView = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <div>
        <h4 className="text-sm font-medium text-card-foreground flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" aria-hidden />
          매출 성장률
        </h4>
        <MarketSizeMetricBars
          nodes={metricNodes}
          metricKey="revenueGrowth"
          isLoading={isLoading}
          onSelect={selectedCategory ? undefined : setSelectedCategoryId}
        />
      </div>
      <div>
        <h4 className="text-sm font-medium text-card-foreground flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-info" aria-hidden />
          목표주가 상승여력
        </h4>
        <MarketSizeMetricBars
          nodes={metricNodes}
          metricKey="targetUpside"
          isLoading={isLoading}
          onSelect={selectedCategory ? undefined : setSelectedCategoryId}
        />
      </div>
    </div>
  )

  const barsNote = selectedCategory
    ? '섹터별 · 지표 높은 순.'
    : '카테고리별 · 지표 높은 순(막대 클릭 시 섹터로 드릴다운).'

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        lastUpdated={data?.date}
        shareTitle="시장 규모 | Sector King"
        shareDescription="섹터·카테고리별 시장 규모(시총·매출)와 성장 전망 시각화"
        subtitle="시장 규모"
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 컨트롤 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" aria-hidden />
              시장 규모 · 성장 전망
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.date ? `${data.date} 기준 · ` : ''}
              {selectedCategory
                ? `${selectedCategory.name} 섹터 ${metricNodes.length}개`
                : `카테고리 ${metricNodes.length}개`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <label className="sr-only" htmlFor="industry-select">
              산업 선택
            </label>
            <select
              id="industry-select"
              value={industryId ?? ''}
              onChange={(e) => {
                setIndustryId(e.target.value || null)
                setSelectedCategoryId(null)
              }}
              className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-3 text-sm text-foreground"
            >
              <option value="">전체 산업</option>
              {industriesData?.industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
            <RegionToggle value={region} onChange={setRegion} size="sm" />
          </div>
        </div>

        {isError && (
          <div className="sk-card text-sm text-destructive">
            데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {/* 성장 전망 — 막대(모바일·PC 기본) / 버블(PC 토글) */}
        <div className="sk-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-card-foreground min-w-0 truncate">
              {selectedCategory
                ? `${selectedCategory.name} · 섹터별 성장 전망`
                : '카테고리별 성장 전망'}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {/* 뷰 토글 — PC 전용 */}
              <div
                role="group"
                aria-label="차트 형태 선택"
                className="hidden lg:inline-flex rounded-lg overflow-hidden border border-border-subtle"
              >
                {([
                  { key: 'bars', label: '막대', Icon: BarChart2 },
                  { key: 'bubble', label: '버블', Icon: CircleDot },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setViewMode(key)}
                    aria-pressed={viewMode === key}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                      viewMode === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
                  전체 카테고리
                </button>
              )}
            </div>
          </div>

          {/* 모바일: 항상 막대 */}
          <div className="lg:hidden">
            {barsView}
            <p className="mt-4 text-xs text-muted-foreground">
              {barsNote} 데이터 없는 항목은 제외 · 극단값은 실제 %로 표기(막대는 상한 적용).
            </p>
          </div>

          {/* PC: 토글 결과 */}
          <div className="hidden lg:block">
            {viewMode === 'bars' ? (
              <>
                {barsView}
                <p className="mt-4 text-xs text-muted-foreground">
                  {barsNote} 데이터 없는 항목은 제외 · 극단값은 실제 %로 표기(막대는 상한 적용).
                </p>
              </>
            ) : isLoading ? (
              <div className="h-[30rem] bg-muted/30 rounded-lg animate-pulse" />
            ) : (
              <>
                <MarketSizeBubbleChart
                  groups={bubbleGroups}
                  onSelect={selectedCategory ? undefined : setSelectedCategoryId}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  오른쪽 위일수록 성장률·상승여력이 모두 높습니다(중앙값 기준선 참고).{' '}
                  {selectedCategory
                    ? '버블 = 섹터 · 크기: 시총.'
                    : '버블 = 카테고리(클릭 시 섹터로 드릴다운) · 색: 소속 산업.'}{' '}
                  성장률 극단값은 축 끝에 모아 표시(툴팁은 실제값).
                  {excludedCount > 0 &&
                    ` 데이터가 없는 ${excludedCount}개 항목은 제외됨.`}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 시총 지도 — 산업 그룹 안에 섹터 타일 */}
        <div className="sk-card">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2 mb-4">
            <LayoutGrid className="w-5 h-5 text-success" aria-hidden />
            산업 · 섹터 시총 지도
            <span className="text-xs font-normal text-muted-foreground">
              섹터 {mapSectorCount}개
            </span>
          </h3>
          {isLoading ? (
            <div className="h-[28rem] sm:h-[36rem] bg-muted/30 rounded-lg animate-pulse" />
          ) : (
            <MarketSizeIndustryMap
              groups={industryGroups}
              onSelectSector={setSelectedSector}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            바깥 묶음 = 산업, 타일 = 소속 섹터. 면적 = 시가총액(USD 정규화 후 합산) ·
            색: 매출 성장률(청록 낮음 → 보라 높음). 섹터를 클릭하면 포함 종목 표가 열립니다.
            <span className="sm:hidden"> 좁은 화면에서는 좌우로 밀어서 볼 수 있습니다.</span>
          </p>
        </div>

        <MarketSizeExplainer />
      </main>

      {/* 섹터 → 종목 표 */}
      <AnimatePresence>
        {selectedSector && (
          <SectorCompanyList
            key={selectedSector.id}
            sectorId={selectedSector.id}
            sectorName={selectedSector.name}
            period={14}
            region={region}
            onClose={() => setSelectedSector(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
