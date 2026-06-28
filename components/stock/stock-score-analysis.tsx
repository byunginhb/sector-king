'use client'

import Link from 'next/link'
import { BarChart3, ExternalLink } from 'lucide-react'
import { formatPercent, formatRecommendation, formatScore } from '@/lib/format'
import { SCORING } from '@/lib/scoring-methodology'
import { cn } from '@/lib/utils'
import type { CompanyDetailResponse } from '@/types'

type Score = NonNullable<CompanyDetailResponse['score']>
type Snapshot = CompanyDetailResponse['snapshot']

interface ScoreDimension {
  label: string
  value: number
  max: number
  color: string
  description: string
  metrics?: { label: string; value: string }[]
}

interface StockScoreAnalysisProps {
  score: Score
  snapshot: Snapshot
  /** 출처 링크용 티커(Yahoo Finance 종목 분석 페이지). */
  ticker: string
}

/**
 * 패권 점수 분석 — 총점 + 4개 차원(규모/성장성/수익성/시장평가) 브레이크다운.
 * 각 진행 바는 `role="progressbar"` + aria-valuenow/min/max 로 접근성 노출.
 */
export function StockScoreAnalysis({ score, snapshot, ticker }: StockScoreAnalysisProps) {
  const totalPercent = Math.min((score.total / SCORING.totalMaxScore) * 100, 100)

  const dimensions: ScoreDimension[] = [
    {
      label: '규모',
      value: score.scale,
      max: SCORING.scale.maxScore,
      color: 'bg-chart-3',
      description: '섹터 내 시가총액 비중과 거래 활성도',
    },
    {
      label: '성장성',
      value: score.growth,
      max: SCORING.growth.maxScore,
      color: 'bg-chart-2',
      description: '분기별 매출/수익 성장률',
      metrics: [
        ...(score.revenueGrowth !== null
          ? [{ label: '매출 성장률', value: formatPercent(score.revenueGrowth) }]
          : []),
        ...(score.earningsGrowth !== null
          ? [{ label: '수익 성장률', value: formatPercent(score.earningsGrowth) }]
          : []),
      ],
    },
    {
      label: '수익성',
      value: score.profitability,
      max: SCORING.profitability.maxScore,
      color: 'bg-chart-1',
      description: '영업이익률과 자기자본이익률',
      metrics: [
        ...(score.operatingMargin !== null
          ? [{ label: '영업이익률', value: formatPercent(score.operatingMargin) }]
          : []),
        ...(score.returnOnEquity !== null
          ? [{ label: 'ROE', value: formatPercent(score.returnOnEquity) }]
          : []),
      ],
    },
    {
      label: '시장 평가',
      value: score.sentiment,
      max: SCORING.sentiment.maxScore,
      color: 'bg-chart-4',
      description: '애널리스트 투자의견과 목표주가 괴리율',
      metrics: [
        ...(score.recommendationKey
          ? [
              {
                label: '애널리스트 의견',
                value: `${formatRecommendation(score.recommendationKey)}${score.analystCount ? ` (${score.analystCount}명)` : ''}`,
              },
            ]
          : []),
        ...(score.targetMeanPrice !== null && snapshot?.price
          ? [
              {
                label: '목표주가 대비',
                value: formatPercent((score.targetMeanPrice - snapshot.price) / snapshot.price),
              },
            ]
          : []),
      ],
    },
  ]

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" aria-hidden />
        패권 점수 분석
      </h3>

      <div className="rounded-xl border border-border p-4 space-y-4">
        {/* Total Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{score.total.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ {SCORING.totalMaxScore}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            데이터 커버리지 {Math.round(score.dataQuality * 100)}%
          </span>
        </div>
        <div
          className="bg-muted h-1.5 rounded-sm overflow-hidden"
          role="progressbar"
          aria-label="패권 점수 총점"
          aria-valuenow={Math.round(score.total * 10) / 10}
          aria-valuemin={0}
          aria-valuemax={SCORING.totalMaxScore}
        >
          <div
            className="bg-primary h-full rounded-sm transition-[width] duration-300"
            style={{ width: `${totalPercent}%` }}
          />
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3 pt-1">
          {dimensions.map((dim) => {
            const percent = Math.min((dim.value / dim.max) * 100, 100)
            return (
              <div key={dim.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{dim.label}</span>
                  <span className="text-muted-foreground">{formatScore(dim.value, dim.max)}</span>
                </div>
                <div
                  className="bg-muted rounded-full h-1.5"
                  role="progressbar"
                  aria-label={`${dim.label} 점수`}
                  aria-valuenow={Math.round(dim.value * 10) / 10}
                  aria-valuemin={0}
                  aria-valuemax={dim.max}
                >
                  <div
                    className={cn('rounded-full h-1.5 transition-all', dim.color)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{dim.description}</p>
                {dim.metrics && dim.metrics.length > 0 && (
                  <div className="pl-2 space-y-0.5">
                    {dim.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-medium text-foreground">{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Methodology Link + Data Source */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <Link href="/methodology" className="text-[11px] text-info hover:underline">
            방법론 상세 보기 →
          </Link>
          <a
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/analysis`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="데이터 출처: Yahoo Finance (새 탭에서 열림)"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            데이터 출처: Yahoo Finance
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  )
}
