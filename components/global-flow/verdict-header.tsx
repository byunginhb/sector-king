import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react'
import type { PeriodView } from '@/lib/global-flow/compute'
import { cn } from '@/lib/utils'
import { fmtPct, toneOf } from './format'

interface Props {
  view: PeriodView
  rulerLevels: { dxy: number | null; usdkrw: number | null }
}

/**
 * 한 줄 결론 + 잣대 띠. 결론은 규칙 기반 문장(lib/global-flow/compute buildVerdict)이라
 * 같은 데이터면 항상 같은 문장이 나온다 — LLM 생성 문구가 아니다.
 */
export function VerdictHeader({ view, rulerLevels }: Props) {
  const { verdict, rulers } = view
  return (
    <div className="sk-card p-5 sm:p-6">
      <p className="eyebrow mb-2">지금 판정</p>
      <p className="font-display text-xl font-semibold leading-snug text-foreground sm:text-2xl">
        {verdict.sentence}
      </p>
      {(verdict.leader || verdict.laggard) && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {verdict.leader && (
            <span className="inline-flex items-center gap-1 text-foreground/80">
              <ArrowUpRight className="h-4 w-4 text-success" aria-hidden />
              가장 강한 자산 <strong className="text-foreground">{verdict.leader.name}</strong>
              <span className={cn('num-mono', toneOf(verdict.leader.returnPct))}>
                {fmtPct(verdict.leader.returnPct)}
              </span>
            </span>
          )}
          {verdict.laggard && (
            <span className="inline-flex items-center gap-1 text-foreground/80">
              <ArrowDownRight className="h-4 w-4 text-danger" aria-hidden />
              가장 약한 자산 <strong className="text-foreground">{verdict.laggard.name}</strong>
              <span className={cn('num-mono', toneOf(verdict.laggard.returnPct))}>
                {fmtPct(verdict.laggard.returnPct)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* 잣대 띠 — 모든 금액이 USD 라 달러가 강해지면 다른 자산이 일괄 작아 보인다. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border-subtle pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          잣대
        </span>
        <span>
          달러 인덱스{' '}
          <span className="num-mono text-foreground">{rulerLevels.dxy?.toFixed(2) ?? '—'}</span>{' '}
          <span className={cn('num-mono', toneOf(rulers.dxyPct))}>{fmtPct(rulers.dxyPct, 2)}</span>
        </span>
        <span>
          원/달러{' '}
          <span className="num-mono text-foreground">
            {rulerLevels.usdkrw?.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) ?? '—'}
          </span>{' '}
          <span className={cn('num-mono', toneOf(rulers.usdkrwPct))}>
            {fmtPct(rulers.usdkrwPct, 2)}
          </span>
        </span>
        <span className="basis-full sm:basis-auto">
          모든 금액은 달러 기준 — 달러가 강하면 다른 자산이 일괄 작아 보입니다
        </span>
      </div>
    </div>
  )
}
