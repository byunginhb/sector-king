/**
 * 메인 화면 워치리스트 카드 — 본인 워치 ticker 의 PnL 요약.
 *
 * 비어있을 때: "별 표시로 추가" CTA + 인기 검색 안내.
 */
'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, Star, ArrowRight } from 'lucide-react'
import { useMySummary } from '@/hooks/me/use-my-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function MyWatchlistCard() {
  const { data, isLoading, error } = useMySummary()

  if (isLoading) return <CardShell><LoadingState /></CardShell>
  if (error) return null
  if (!data) return null

  const { summary, items } = data

  if (summary.watchCount === 0) {
    return (
      <CardShell>
        <EmptyState />
      </CardShell>
    )
  }

  const avg = summary.averageChange ?? 0
  const trend: 'up' | 'down' | 'flat' =
    avg > 0 ? 'up' : avg < 0 ? 'down' : 'flat'

  return (
    <CardShell>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            내 워치리스트
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {summary.watchCount}개 종목 · 평균{' '}
            <span
              className={cn(
                'tabular-nums font-medium',
                trend === 'up'
                  ? 'text-success'
                  : trend === 'down'
                    ? 'text-danger'
                    : 'text-muted-foreground'
              )}
            >
              {avg > 0 ? '+' : ''}
              {avg.toFixed(2)}%
            </span>
          </p>
        </div>
        <Link
          href="/me/watchlist"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start sm:self-end"
        >
          전체보기 <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Column title="상승 Top" trend="up" items={summary.topGainers} />
        <Column title="하락 Top" trend="down" items={summary.topLosers} />
      </div>

      {items.length > 0 && summary.topGainers.length === 0 && summary.topLosers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          가격 데이터가 아직 집계되지 않았습니다.
        </p>
      )}
    </CardShell>
  )
}

function Column({
  title,
  trend,
  items,
}: {
  title: string
  trend: 'up' | 'down'
  items: { ticker: string; displayName: string | null; priceChange: number | null }[]
}) {
  const Icon = trend === 'up' ? TrendingUp : TrendingDown
  const color = trend === 'up' ? 'text-success' : 'text-danger'

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2/40 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('h-3.5 w-3.5', color)} aria-hidden />
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 py-2 flex items-center gap-1">
          <Minus className="h-3 w-3" aria-hidden />
          데이터 없음
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.ticker}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate text-foreground">
                {item.displayName ?? item.ticker}
              </span>
              <span className={cn('tabular-nums font-medium', color)}>
                {item.priceChange !== null
                  ? `${item.priceChange > 0 ? '+' : ''}${item.priceChange.toFixed(2)}%`
                  : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      {children}
    </section>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-6">
      <Star
        className="h-7 w-7 mx-auto text-muted-foreground mb-2"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground mb-1">
        아직 추가한 워치리스트가 없습니다
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        산업/섹터/회사 카드의 별표를 눌러 추적을 시작하세요.
      </p>
      <Link
        href="/me/onboarding"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-sm hover:bg-surface-2"
      >
        추천 종목으로 시작하기
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
