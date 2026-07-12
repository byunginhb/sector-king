'use client'

import { Zap, TrendingUp } from 'lucide-react'
import { computeRankingScores, computeMomentumDelta } from '@/lib/ranking-score'
import { shortScoreReason, longScoreReason } from '@/lib/score-reason'
import { InfoTip } from '@/components/rankings/info-tip'
import { HintPopover } from '@/components/ui/hint-popover'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse, ScoreHistoryPoint } from '@/types'

interface ShortLongScoresProps {
  data: CompanyDetailResponse
  /** 인사이트 score_history(없으면 모멘텀 결손 처리). 랭킹 API 와 동일한 Δ 산식 공유. */
  scoreHistory?: ScoreHistoryPoint[]
}

/** 단일 점수 카드(막대 + 숫자 + 1줄 설명). */
function ScoreCard({
  label,
  caption,
  tip,
  score,
  Icon,
  partialNote,
  reason,
}: {
  label: string
  caption: string
  tip: string
  score: number | null
  Icon: typeof Zap
  partialNote?: boolean
  /** 이 종목이 왜 이 점수인지 한 줄 근거(호버·탭 팝오버). */
  reason?: string
}) {
  const rounded = score == null ? null : Math.round(score)
  const fillTone =
    rounded == null
      ? 'bg-muted-foreground/40'
      : rounded >= 75
        ? 'bg-primary'
        : rounded >= 40
          ? 'bg-chart-2'
          : 'bg-muted-foreground/40'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <p className="eyebrow">{label}</p>
        <InfoTip label={label} text={tip} />
      </div>
      {rounded != null ? (
        <>
          <div className="flex items-baseline gap-1">
            {reason ? (
              <HintPopover
                label={`${label} 근거`}
                content={
                  <>
                    <p className="mb-1 font-semibold text-foreground">{label} 근거</p>
                    <p>{reason}</p>
                  </>
                }
                className="num-mono text-3xl font-bold tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {rounded}
              </HintPopover>
            ) : (
              <span className="num-mono text-3xl font-bold tabular-nums text-foreground">
                {rounded}
              </span>
            )}
            <span className="num-mono text-xs text-muted-foreground">/ 100</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={label}
            aria-valuenow={rounded}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', fillTone)}
              style={{ width: `${Math.max(Math.min(rounded, 100), 3)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{caption}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">아직 점수를 매기는 중이에요</p>
      )}
      {partialNote && (
        <p className="text-[11px] text-muted-foreground">추세 데이터가 짧아요(상장 초기 종목)</p>
      )}
    </div>
  )
}

/**
 * 종목 상세 — 단기/장기 점수(랭킹 페이지와 동일 SoT·동일 입력 → 동일 숫자).
 *
 * 입력은 이미 toUsd 된 detail 응답(snapshot/analystUpside/score) + insights.scoreHistory.
 * 패권 점수(총점)와 별개 개념으로, 그 아래에 노출한다.
 */
export function ShortLongScores({ data, scoreHistory }: ShortLongScoresProps) {
  const { snapshot, score, analystUpside } = data

  // 랭킹 API 와 동일한 공유 함수로 Δ 산출(동일 시계열 → 동일 단기 점수).
  const momentumDelta = computeMomentumDelta(
    (scoreHistory ?? []).map((h) => h.total)
  )

  // snapshot 가격성은 detail API 에서 이미 USD 환산됨. 52주 위치는 같은 통화 비율이라 그대로 사용.
  const result = computeRankingScores({
    momentumDelta,
    price: snapshot?.price ?? null,
    week52High: snapshot?.week52High ?? null,
    week52Low: snapshot?.week52Low ?? null,
    sentimentScore: score?.sentiment ?? null,
    profitabilityScore: score?.profitability ?? null,
    growthScore: score?.growth ?? null,
    scaleScore: score?.scale ?? null,
    targetUsd: analystUpside?.targetMeanPriceUsd ?? null,
    priceUsd: analystUpside?.currentPriceUsd ?? snapshot?.price ?? null,
  })

  // 52주 밴드 내 위치(0~1) — 단기 근거용. 같은 통화 비율이라 환산 불요.
  const week52Position =
    snapshot?.price != null &&
    snapshot?.week52High != null &&
    snapshot?.week52Low != null &&
    snapshot.week52High > snapshot.week52Low
      ? Math.min(
          Math.max((snapshot.price - snapshot.week52Low) / (snapshot.week52High - snapshot.week52Low), 0),
          1
        )
      : null

  const shortReason =
    result.shortScore == null
      ? undefined
      : shortScoreReason({
          week52Position,
          momentumDelta,
          momentumPartial: result.momentumPartial,
          sentimentNorm: score?.sentiment ?? null,
        })
  const longReason =
    result.longScore == null
      ? undefined
      : longScoreReason({
          profitabilityNorm: score?.profitability ?? null,
          growthNorm: score?.growth ?? null,
          scaleNorm: score?.scale ?? null,
          upsidePct: result.upsidePct,
        })

  return (
    <section className="sk-card space-y-4">
      <div className="border-b border-border-subtle pb-3">
        <p className="eyebrow eyebrow-accent mb-1">단기 · 장기</p>
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">이 종목의 단기·장기 점수</h2>
          <InfoTip
            label="단기·장기 점수"
            text="단기는 지금 분위기·흐름, 장기는 오래 묵힐 가치를 0~100점으로 매긴 값입니다. 점수 랭킹과 똑같은 기준이에요."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreCard
          label="단기 점수"
          caption="지금 분위기·흐름이 좋은가"
          tip="최근 주가 흐름·52주 안에서의 위치·시장 심리를 모아 지금 흐름을 0~100점으로 나타냅니다."
          score={result.shortScore}
          Icon={Zap}
          partialNote={result.momentumPartial}
          reason={shortReason}
        />
        <ScoreCard
          label="장기 점수"
          caption="오래 묵힐 만한 가치가 있나"
          tip="얼마나 잘 버는지·성장하는지·규모가 큰지와 목표가까지 남은 폭을 모아 묵힐 가치를 0~100점으로 나타냅니다."
          score={result.longScore}
          Icon={TrendingUp}
          reason={longReason}
        />
      </div>
    </section>
  )
}
