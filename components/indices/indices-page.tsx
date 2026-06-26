'use client'

import { useQuery } from '@tanstack/react-query'
import { Globe, SearchX } from 'lucide-react'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { IndicesComparisonChart } from './indices-comparison-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types'
import type { IndicesResponse, MarketIndexItem } from '@/app/api/indices/route'

function useIndices() {
  return useQuery<IndicesResponse>({
    queryKey: ['indices'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const res = await fetch('/api/indices')
      if (!res.ok) throw new Error('Failed to fetch indices')
      const json: ApiResponse<IndicesResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}

function fmtLevel(v: number | null): string {
  if (v == null) return 'N/A'
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

function fmtChange(v: number | null): string {
  if (v == null) return 'N/A'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

/** 52주 위치 → 고점 근처/저점권 라벨(없으면 null). */
function positionLabel(pos: number | null): { text: string; tone: string } | null {
  if (pos == null) return null
  if (pos >= 0.9) return { text: '고점 근처', tone: 'text-warning' }
  if (pos <= 0.1) return { text: '저점권', tone: 'text-info' }
  return null
}

function PositionBar({ pos }: { pos: number | null }) {
  if (pos == null) return <span className="text-muted-foreground">N/A</span>
  const pct = Math.round(pos * 100)
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="52주 위치"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 90 ? 'bg-warning' : pct <= 10 ? 'bg-info' : 'bg-primary'
          )}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="num-mono w-9 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  )
}

function IndexRow({ item }: { item: MarketIndexItem }) {
  const changeTone =
    item.changePercent == null
      ? 'text-muted-foreground'
      : item.changePercent >= 0
        ? 'text-success'
        : 'text-danger'
  const label = positionLabel(item.week52Position)

  return (
    <tr className="border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-surface-2">
      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">{item.country}</td>
      <td className="px-3 py-2.5">
        <span className="block font-semibold leading-tight text-foreground">{item.name}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right num-mono tabular-nums text-foreground">
        {fmtLevel(item.price)}
      </td>
      <td className={cn('whitespace-nowrap px-3 py-2.5 text-right num-mono tabular-nums', changeTone)}>
        {fmtChange(item.changePercent)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col items-end gap-0.5">
          <PositionBar pos={item.week52Position} />
          {label && <span className={cn('text-[11px] font-medium', label.tone)}>{label.text}</span>}
        </div>
      </td>
    </tr>
  )
}

export function IndicesPage() {
  const { data, isLoading, isError } = useIndices()
  const items = data?.items ?? []
  const asOf = items.find((i) => i.asOfDate)?.asOfDate ?? null

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar
        shareTitle="세계 주요 지수 | Sector King"
        shareDescription="미국·한국·일본·인도 등 주요 국가 대표 지수 한눈에"
        subtitle={<span>세계 주요 지수</span>}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow eyebrow-accent mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3 w-3" aria-hidden />
              세계 지수
            </p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              주요 국가 대표 지수
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-foreground/70 sm:text-sm">
              나라별 대표 주가지수의 현재 수준과 1일 등락, 그리고 1년 범위에서 지금 어디쯤인지를
              보여줍니다. 고점 근처인지 저점권인지 한눈에 참고하세요.
            </p>
          </div>
          {asOf && (
            <p className="shrink-0 num-mono text-xs text-muted-foreground tabular-nums">{asOf} 기준</p>
          )}
        </div>

        {/* 국가별 정규화 비교 그래프 (1주/1개월/1년/5년) */}
        <IndicesComparisonChart />

        {isError && (
          <div className="sk-card flex flex-col items-center gap-2 py-10 text-center">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">지수를 불러오지 못했어요</p>
            <p className="text-xs text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
          </div>
        )}

        {isLoading && !data && (
          <div className="overflow-hidden rounded-md border border-border-subtle">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border-subtle/70 px-3 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-10 shrink-0" />
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}

        {data && items.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-1 text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 text-left">국가</th>
                  <th scope="col" className="px-3 py-2.5 text-left">지수</th>
                  <th scope="col" className="px-3 py-2.5 text-right">현재 지수</th>
                  <th scope="col" className="px-3 py-2.5 text-right">1일 등락</th>
                  <th scope="col" className="px-3 py-2.5 text-right">52주 위치</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <IndexRow key={item.symbol} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && items.length === 0 && !isLoading && (
          <div className="sk-card flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">표시할 지수가 없습니다</p>
          </div>
        )}
      </main>
    </div>
  )
}
