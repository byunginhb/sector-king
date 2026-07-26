'use client'

import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import type { Direction, PredictionStatus } from '@/types'

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
  unscorable: { label: '평가 전', tone: 'bg-muted text-muted-foreground' },
  hold: null,
  new: null,
}
