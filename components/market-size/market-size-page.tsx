'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, PieChart, TrendingUp, Target } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { RegionToggle } from '@/components/region-toggle'
import { useRegion } from '@/hooks/use-region'
import { useIndustries } from '@/hooks/use-industries'
import { useMarketSize } from '@/hooks/use-market-size'
import { MarketSizeTreemap, type TreemapItem } from './market-size-treemap'
import {
  MarketSizeMetricBars,
  type MetricNode,
} from './market-size-metric-bars'
import { MarketSizeExplainer } from './market-size-explainer'
import type { MarketSizeCategory } from '@/types'

/** "전체" 뷰에서 표시할 카테고리 상한 (시총 상위). */
const TOP_N = 30

export function MarketSizePage() {
  const { region, setRegion } = useRegion()
  const [industryId, setIndustryId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

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
  const truncated = !industryId && categories.length > TOP_N

  // 막대·트리맵 공용 소스 — 드릴다운이면 섹터, 아니면 카테고리.
  const metricNodes = useMemo<MetricNode[]>(
    () => (selectedCategory ? selectedCategory.sectors : shownCategories),
    [selectedCategory, shownCategories]
  )
  const treemapItems = useMemo<TreemapItem[]>(
    () =>
      metricNodes.map((n) => ({
        id: n.id,
        name: n.name,
        marketCap: n.marketCap,
        revenueGrowth: n.revenueGrowth,
      })),
    [metricNodes]
  )

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

        {/* 성장 전망 — 매출 성장률 / 상승여력 분리 막대 */}
        <div className="sk-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-card-foreground">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* 매출 성장률 */}
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

            {/* 목표주가 상승여력 */}
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

          <p className="mt-4 text-xs text-muted-foreground">
            {selectedCategory
              ? '섹터별 · 지표 높은 순.'
              : '카테고리별 · 지표 높은 순(막대 클릭 시 섹터로 드릴다운).'}{' '}
            데이터 없는 항목은 제외 · 극단값은 실제 %로 표기(막대는 비교용으로 상한 적용).
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
