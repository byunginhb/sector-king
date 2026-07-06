'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, PieChart, Layers } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { RegionToggle } from '@/components/region-toggle'
import { useRegion } from '@/hooks/use-region'
import { useIndustries } from '@/hooks/use-industries'
import { useMarketSize } from '@/hooks/use-market-size'
import {
  MarketSizeBubbleChart,
  type BubbleGroup,
  type BubblePoint,
} from './market-size-bubble-chart'
import { MarketSizeTreemap, type TreemapItem } from './market-size-treemap'
import { MarketSizeExplainer } from './market-size-explainer'
import type { MarketSizeCategory, MarketSizeNode } from '@/types'

/** "전체" 뷰에서 버블·트리맵에 표시할 카테고리 상한 (시총 상위). */
const TOP_N = 30

// 산업 색 팔레트 (검정·순빨강 배제 톤). industryId 순서로 배정.
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

export function MarketSizePage() {
  const { region, setRegion } = useRegion()
  const [industryId, setIndustryId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const { data: industriesData } = useIndustries({ region })
  const { data, isLoading, isError } = useMarketSize({ region, industryId })

  // industryId → 색
  const industryColor = useMemo(() => {
    const map = new Map<string, string>()
    industriesData?.industries.forEach((ind, i) => {
      map.set(ind.id, INDUSTRY_PALETTE[i % INDUSTRY_PALETTE.length])
    })
    return map
  }, [industriesData])

  const categories = useMemo(() => data?.categories ?? [], [data])
  const selectedCategory: MarketSizeCategory | null = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) ?? null
    : null

  // 전체 뷰: 시총 상위 TOP_N (산업 선택 시 전체 노출)
  const shownCategories = useMemo(() => {
    if (industryId) return categories
    return categories.slice(0, TOP_N)
  }, [categories, industryId])
  const truncated = !industryId && categories.length > TOP_N

  // 버블 그룹 + 트리맵 아이템
  const { groups, treemapItems, excludedCount } = useMemo(() => {
    if (selectedCategory) {
      // 섹터 드릴다운 — 단일 산업색 그룹
      const color = selectedCategory.industryId
        ? industryColor.get(selectedCategory.industryId) ?? FALLBACK_COLOR
        : FALLBACK_COLOR
      const points = selectedCategory.sectors
        .map(toPoint)
        .filter((p): p is BubblePoint => p !== null)
      const excluded = selectedCategory.sectors.length - points.length
      const groups: BubbleGroup[] = [
        { key: 'sectors', label: selectedCategory.name, color, points },
      ]
      const treemapItems: TreemapItem[] = selectedCategory.sectors.map((s) => ({
        id: s.id,
        name: s.name,
        marketCap: s.marketCap,
        revenueGrowth: s.revenueGrowth,
      }))
      return { groups, treemapItems, excludedCount: excluded }
    }

    // 카테고리 뷰 — 산업별 그룹
    const byIndustry = new Map<string, BubbleGroup>()
    let excluded = 0
    for (const c of shownCategories) {
      const point = toPoint(c)
      if (!point) {
        excluded += 1
        continue
      }
      const key = c.industryId ?? 'none'
      const label = c.industryName ?? '기타'
      const color = c.industryId
        ? industryColor.get(c.industryId) ?? FALLBACK_COLOR
        : FALLBACK_COLOR
      const g = byIndustry.get(key) ?? { key, label, color, points: [] }
      g.points.push(point)
      byIndustry.set(key, g)
    }
    const treemapItems: TreemapItem[] = shownCategories.map((c) => ({
      id: c.id,
      name: c.name,
      marketCap: c.marketCap,
      revenueGrowth: c.revenueGrowth,
    }))
    return {
      groups: Array.from(byIndustry.values()),
      treemapItems,
      excludedCount: excluded,
    }
  }, [selectedCategory, shownCategories, industryColor])

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
                ? `${selectedCategory.name} 섹터 ${treemapItems.length}개`
                : `카테고리 ${treemapItems.length}개`}
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

        {/* 버블 차트 */}
        <div className="sk-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-info" aria-hidden />
              {selectedCategory
                ? `${selectedCategory.name} · 섹터별 성장 전망`
                : '카테고리별 성장 전망'}
            </h3>
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
          {isLoading ? (
            <div className="h-[30rem] bg-muted/30 rounded-lg animate-pulse" />
          ) : (
            <MarketSizeBubbleChart
              groups={groups}
              onSelect={selectedCategory ? undefined : setSelectedCategoryId}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            오른쪽 위일수록 성장률·상승여력이 모두 높습니다(중앙값 기준선 참고).{' '}
            {selectedCategory
              ? '버블 = 섹터 · 크기: 시총.'
              : '버블 = 카테고리(클릭 시 섹터로 드릴다운) · 색: 소속 산업.'}{' '}
            성장률 극단값은 축 오른쪽 끝에 모아 표시(툴팁은 실제값).
            {excludedCount > 0 &&
              ` 성장률·상승여력 데이터가 없는 ${excludedCount}개 항목은 제외됨.`}
          </p>
        </div>

        {/* 트리맵 */}
        <div className="sk-card">
          <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-success" aria-hidden />
            {selectedCategory
              ? `${selectedCategory.name} · 섹터 시총 비율`
              : '카테고리 시총 비율'}
          </h3>
          {isLoading ? (
            <div className="h-80 bg-muted/30 rounded-lg animate-pulse" />
          ) : (
            <MarketSizeTreemap
              items={treemapItems}
              onSelect={selectedCategory ? undefined : setSelectedCategoryId}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            면적 = 시가총액(USD 정규화 후 합산) · 색: 매출 성장률(청록 낮음 → 보라 높음).
            {truncated && ` 시총 상위 ${TOP_N}개만 표시.`}
          </p>
        </div>

        <MarketSizeExplainer />
      </main>
    </div>
  )
}
