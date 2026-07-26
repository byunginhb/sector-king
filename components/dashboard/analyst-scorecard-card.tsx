'use client'

import Link from 'next/link'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { useAnalysts } from '@/hooks/use-analysts'
import { fmtScore, scoreTone, scoreBar } from '@/components/analysts/ui'
import { cn } from '@/lib/utils'

/**
 * 메인 대시보드용 애널리스트 성적표 티저 — 신규 기능 홍보 진입점.
 * 방향 적중률 상위 3인만 미리보기로 노출하고 전체는 /analysts 로 유도한다.
 * useAnalysts 를 그대로 재사용(별도 API 없음). 데이터 없으면 렌더 생략.
 */
export function AnalystScorecardCard() {
  const { data, isLoading } = useAnalysts()

  if (isLoading) return null
  const top = data?.ranked.slice(0, 3) ?? []
  if (top.length === 0) return null

  return (
    <section className="mt-8" aria-label="애널리스트 성적표">
      <div className="mb-3 flex items-center gap-2">
        <p className="eyebrow eyebrow-accent">Analyst Scorecard</p>
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          NEW
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        <div className="flex items-start gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">
          <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-tight text-foreground">
              애널리스트, 예측대로 맞혔나?
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              방향 적중률에 예측 횟수까지 반영한 예측력 점수 순위
            </p>
          </div>
        </div>

        <ol className="divide-y divide-border-subtle">
          {top.map((row, idx) => (
            <li key={row.analystId}>
              <Link
                href="/analysts"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5"
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                    idx === 0
                      ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300'
                      : idx === 1
                        ? 'bg-slate-400/20 text-slate-600 dark:text-slate-300'
                        : 'bg-orange-400/15 text-orange-700 dark:text-orange-400'
                  )}
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.firm}</span>
                </span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                  <span
                    className={cn('block h-full rounded-full', scoreBar(row.score))}
                    style={{ width: `${row.score}%` }}
                  />
                </span>
                <span className={cn('w-12 shrink-0 text-right text-sm font-semibold tabular-nums', scoreTone(row.score))}>
                  {fmtScore(row.score)}
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-surface-2/40 px-4 py-3 sm:px-5">
          <p className="text-[11px] text-muted-foreground">종목별 목표가 vs 실제 주가 비교까지</p>
          <Link
            href="/analysts"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            전체 성적표 보기
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
