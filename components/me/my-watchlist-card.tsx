/**
 * 메인 화면 워치리스트 카드 — 본인 워치 ticker 의 PnL 요약.
 *
 * 비어있을 때: "별 표시로 추가" CTA + 인기 검색 안내.
 */
'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, Star, ArrowRight } from 'lucide-react'
import { useMySummary } from '@/hooks/me/use-my-summary'
import { useWatchlist } from '@/hooks/me/use-watchlist'
import { IndustryIcon } from '@/components/ui/industry-icon'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function MyWatchlistCard() {
  const summaryQ = useMySummary()
  const watchQ = useWatchlist()

  if (summaryQ.isLoading || watchQ.isLoading) {
    return <CardShell><LoadingState /></CardShell>
  }
  if (summaryQ.error || watchQ.error) return null

  const summary = summaryQ.data?.summary
  const allItems = watchQ.items ?? []
  const tickerItems = allItems.filter((i) => i.itemType === 'ticker')
  const industryItems = allItems.filter((i) => i.itemType === 'industry')
  const sectorItems = allItems.filter((i) => i.itemType === 'sector')

  // 전체 워치 0개 → 진짜 빈 상태
  if (allItems.length === 0) {
    return (
      <CardShell>
        <EmptyState />
      </CardShell>
    )
  }

  const tickerCount = tickerItems.length
  const avg = summary?.averageChange ?? 0
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
            {tickerCount > 0 ? (
              <>
                {tickerCount}개 종목 · 평균{' '}
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
              </>
            ) : (
              <>{allItems.length}개 추적 중 — 종목 별표를 누르면 PnL이 보여요</>
            )}
          </p>
        </div>
        <Link
          href="/me/watchlist"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start sm:self-end"
        >
          전체보기 <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {/* 산업·섹터 칩 (있을 때만) */}
      {(industryItems.length > 0 || sectorItems.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {industryItems.map((i) => (
            <Link
              key={i.id}
              href={`/${i.itemKey}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-foreground hover:bg-surface-3 transition-colors"
            >
              <IndustryIcon iconKey={i.itemKey} className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[10rem]">{i.displayName ?? i.itemKey}</span>
            </Link>
          ))}
          {sectorItems.map((i) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-foreground"
            >
              <CategoryIcon iconKey={i.itemKey} className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[10rem]">{i.displayName ?? i.itemKey}</span>
            </span>
          ))}
        </div>
      )}

      {/* 종목 PnL Top — ticker가 있을 때만 */}
      {tickerCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Column title="상승 Top" trend="up" items={summary?.topGainers ?? []} />
          <Column title="하락 Top" trend="down" items={summary?.topLosers ?? []} />
        </div>
      )}

      {tickerCount > 0 &&
        (summary?.topGainers.length ?? 0) === 0 &&
        (summary?.topLosers.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            가격 데이터가 아직 집계되지 않았습니다.
          </p>
        )}

      {/* ticker 0개일 때 — 종목 추가 안내 */}
      {tickerCount === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          개별 종목을 추가하려면 산업 → 섹터 → 회사로 들어가 별표를 눌러주세요.
        </div>
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
