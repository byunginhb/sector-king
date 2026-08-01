'use client'

import { TrendingUp, TrendingDown, Minus, Sparkles, Info } from 'lucide-react'
import { HintPopover } from '@/components/ui/hint-popover'
import type { Direction, PredictionStatus } from '@/types'

/**
 * 예측력 점수 개념 설명 툴팁(문구 SoT — 점수가 노출되는 모든 화면에서 재사용).
 * 계산식(Wilson 하한)은 일부러 감추고 "많이 예측 + 잘 맞힘" 컨셉만 전달한다.
 */
export function ScoreHint({ className }: { className?: string }) {
  return (
    <HintPopover
      label="예측력 점수 설명"
      className={className ?? 'inline-flex align-middle text-muted-foreground/70 hover:text-foreground transition-colors'}
      content={
        <span className="block space-y-1.5">
          <span className="block font-semibold text-foreground">예측력 점수란?</span>
          <span className="block">
            <span className="font-medium text-foreground">얼마나 잘 맞혔나(적중률)</span>와{' '}
            <span className="font-medium text-foreground">얼마나 많이 예측했나(리포트 수)</span>를 함께 본 0~100 점수입니다.
          </span>
          <span className="block">
            리포트 1~2건으로 낸 100%보다, 수십 건을 쌓으면서 꾸준히 맞힌 애널리스트를 더 높게 평가합니다. 물론 적중이 빗나감보다
            많아야 점수가 올라갑니다.
          </span>
        </span>
      }
    >
      <Info className="h-3.5 w-3.5" aria-hidden />
    </HintPopover>
  )
}

/** 다중 시리즈 색 팔레트(칩·차트선 공용 SoT). */
export const PALETTE = [
  '#2563eb', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899',
  '#06b6d4', '#84cc16', '#a855f7', '#f97316', '#6366f1',
  '#0ea5e9', '#d946ef', '#22c55e', '#eab308', '#ef4444', '#0891b2',
] as const

/** 컨센서스(중앙값) 선 색 — indigo. */
export const CONSENSUS_COLOR = '#6366f1'

export function pct(rate: number | null): string {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`
}

export function hitRateTone(rate: number | null): string {
  if (rate == null) return 'text-muted-foreground'
  if (rate >= 0.7) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function hitRateBar(rate: number | null): string {
  if (rate == null) return 'bg-muted'
  if (rate >= 0.7) return 'bg-emerald-500'
  if (rate >= 0.5) return 'bg-amber-500'
  return 'bg-rose-500'
}

/** 예측력 점수(0~100) 표기·톤·막대. Wilson 하한 기반이라 초기엔 점수대가 낮게 형성됨. */
export function fmtScore(score: number): string {
  return `${score}점`
}

export function scoreTone(score: number): string {
  if (score >= 60) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 45) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function scoreBar(score: number): string {
  if (score >= 60) return 'bg-emerald-500'
  if (score >= 45) return 'bg-amber-500'
  return 'bg-rose-500'
}

export const DIRECTION_META: Record<Direction, { label: string; icon: typeof TrendingUp; tone: string }> = {
  up: { label: '상향', icon: TrendingUp, tone: 'text-emerald-600 dark:text-emerald-400' },
  down: { label: '하향', icon: TrendingDown, tone: 'text-rose-600 dark:text-rose-400' },
  hold: { label: '유지', icon: Minus, tone: 'text-muted-foreground' },
  new: { label: '신규', icon: Sparkles, tone: 'text-blue-600 dark:text-blue-400' },
}

/** 적중=●, 빗나감=●(색+텍스트 병기로 색맹 대응). null=지표 없음(유지·신규). */
export const STATUS_META: Record<PredictionStatus, { label: string; tone: string } | null> = {
  hit: { label: '적중', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  miss: { label: '빗나감', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  unscorable: { label: '평가 불가', tone: 'bg-muted text-muted-foreground' },
  hold: null,
  new: null,
}
