export function formatMarketCap(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toLocaleString()}`
}

export function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return 'N/A'
  return `$${value.toFixed(2)}`
}

export function formatPriceChange(value: number | null): string {
  if (value === null || value === undefined) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  if (value === 0) return '0'
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toLocaleString()
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return 'N/A'
  return value.toLocaleString()
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

import type { ScoreSummary } from '@/types'

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface RawScoreFields {
  smoothedScore: number | null
  scaleScore: number | null
  growthScore: number | null
  profitabilityScore: number | null
  sentimentScore: number | null
  dataQuality: number | null
}

export function toScoreSummary(raw: RawScoreFields): ScoreSummary | null {
  if (raw.smoothedScore === null) return null
  return {
    total: raw.smoothedScore ?? 0,
    scale: raw.scaleScore ?? 0,
    growth: raw.growthScore ?? 0,
    profitability: raw.profitabilityScore ?? 0,
    sentiment: raw.sentimentScore ?? 0,
    dataQuality: raw.dataQuality ?? 0,
  }
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A'
  const percent = value * 100
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

export function formatScore(score: number, maxScore: number): string {
  return `${score.toFixed(1)}/${maxScore}`
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_buy: '적극 매수',
  buy: '매수',
  hold: '보유',
  underperform: '비중 축소',
  sell: '매도',
  none: '없음',
}

export function formatRecommendation(key: string | null): string {
  if (!key) return 'N/A'
  return RECOMMENDATION_LABELS[key] ?? key
}
