'use client'

import { ArrowUp, AlertTriangle, Sparkles } from 'lucide-react'
import { buildStockSignals, type StockSignal } from '@/lib/stock-signals'
import type { CompanyDetailResponse, CompanyInsightsResponse } from '@/types'

interface SignalSummaryProps {
  data: CompanyDetailResponse
  insights?: CompanyInsightsResponse | null
}

function SignalRow({ signal }: { signal: StockSignal }) {
  const isStrength = signal.kind === 'strength'
  const Icon = isStrength ? ArrowUp : AlertTriangle
  // 색만이 아닌 아이콘+텍스트로 의미 전달 (a11y)
  const tone = isStrength ? 'text-success' : 'text-warning'
  const horizonLabel = signal.horizon === 'short' ? '단기' : signal.horizon === 'long' ? '장기' : null
  return (
    <li className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground">{signal.label}</span>
        {horizonLabel && (
          <span className="ml-1.5 align-middle rounded border border-border-subtle px-1 py-px text-[10px] text-muted-foreground">
            {horizonLabel}
          </span>
        )}
        <span className="ml-1.5 text-xs text-muted-foreground">— {signal.evidence}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/80">출처: {signal.source}</span>
      </div>
      <span className="sr-only">
        {isStrength ? '강점' : '주의'}
        {horizonLabel ? `, ${horizonLabel} 시계` : ''}
      </span>
    </li>
  )
}

/**
 * S2 종합 시그널 요약 — 룰 기반 강점/주의 불릿.
 * 룰 로직은 `lib/stock-signals.ts` 순수 함수로 분리. 과장 금지·근거 병기.
 */
export function SignalSummary({ data, insights }: SignalSummaryProps) {
  const { strengths, cautions } = buildStockSignals({
    detail: {
      score: data.score,
      snapshot: data.snapshot,
      analystUpside: data.analystUpside,
      dominance: data.dominance,
    },
    insights: insights ?? null,
  })

  const hasAny = strengths.length > 0 || cautions.length > 0

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4" aria-hidden />
        종합 시그널
      </h2>

      {!hasAny ? (
        <p className="rounded-md border border-dashed border-border-subtle p-3 text-sm text-muted-foreground">
          현재 데이터로 추출된 두드러진 시그널이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2 text-success">강점</p>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <SignalRow key={s.id} signal={s} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">두드러진 강점 시그널 없음</p>
            )}
          </div>
          <div>
            <p className="eyebrow mb-2 text-warning">주의</p>
            {cautions.length > 0 ? (
              <ul className="space-y-2">
                {cautions.map((s) => (
                  <SignalRow key={s.id} signal={s} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">두드러진 주의 시그널 없음</p>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
        보유 데이터에 룰을 적용한 자동 요약이며, 투자 권유가 아닙니다.
      </p>
    </section>
  )
}
