'use client'

import Link from 'next/link'
import { ArrowRight, Waves } from 'lucide-react'
import { useGlobalFlow } from '@/hooks/use-global-flow'
import { fmtPct, toneOf } from '@/components/global-flow/format'
import { cn } from '@/lib/utils'

/**
 * 홈 1면 띠 — 산업 자금 흐름을 보기 전에 "주식 밖" 큰 그림 한 줄.
 * 데이터가 없으면(첫 수집 전·API 실패) 아무것도 그리지 않는다: 홈의 다른 블록을 밀어내지 않게.
 */
export function GlobalFlowStrip() {
  const { data } = useGlobalFlow()
  const view = data?.periods['1m']
  if (!view || view.verdict.risk == null) return null
  const { verdict } = view

  return (
    <Link
      href="/global-flow"
      className="sk-card sk-card-hover flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-1.5">
          <Waves className="h-3 w-3" aria-hidden />
          주식 밖 · 글로벌 자금
        </p>
        <p className="mt-1 font-semibold text-foreground">{verdict.sentence}</p>
        {verdict.leader && verdict.laggard && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            강세 {verdict.leader.name}{' '}
            <span className={cn('num-mono', toneOf(verdict.leader.returnPct))}>
              {fmtPct(verdict.leader.returnPct)}
            </span>{' '}
            · 약세 {verdict.laggard.name}{' '}
            <span className={cn('num-mono', toneOf(verdict.laggard.returnPct))}>
              {fmtPct(verdict.laggard.returnPct)}
            </span>
          </p>
        )}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        글로벌 자금 지도
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  )
}
