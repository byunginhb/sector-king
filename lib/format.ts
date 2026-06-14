import { getKrwRate, type Currency } from '@/lib/currency'

// 통화 인지 포맷 4종(formatMarketCap/formatPrice/formatPriceCompact/formatFlowAmount).
// 입력은 항상 USD. currency 기본값을 'USD' 로 두어 인자 미지정 기존 호출은 USD 로 동작한다.
// KRW 분기는 formatKrw/getKrwRate 단일 SoT 를 재사용한다(이중환산 방지: raw 원/엔 입력 금지).

export function formatMarketCap(
  value: number | null | undefined,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') return formatKrw(value) // 조원/억원/만원/원 압축 재사용
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toLocaleString()}`
}

export function formatPrice(
  value: number | null,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') {
    const krw = value * getKrwRate()
    return `₩${Math.round(krw).toLocaleString()}` // 원 단위 정수, 천단위 콤마
  }
  return `$${value.toFixed(2)}`
}

/**
 * 좁은 셀(모바일 리스트 등)에서 쓰는 짧은 가격 포맷.
 *  - USD  >= 1e6 : $1.82M / >= 1e5 : $834K / >= 1e4 : $80.3K / >= 1e3 : $3,260 / else $108.77
 *  - KRW         : formatKrw 압축(억/만원) — 좁은 셀 우선이라 단가도 압축
 */
export function formatPriceCompact(
  value: number | null | undefined,
  currency: Currency = 'USD'
): string {
  if (value === null || value === undefined) return 'N/A'
  if (currency === 'KRW') return formatKrw(value) // 억/만원 압축 표기 재사용
  const abs = Math.abs(value)
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e5) return `$${Math.round(value / 1e3).toLocaleString()}K`
  if (abs >= 1e4) return `$${(value / 1e3).toFixed(1)}K`
  if (abs >= 1e3) return `$${Math.round(value).toLocaleString()}`
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

export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)

  if (isNaN(date.getTime())) return dateStr

  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return formatDate(dateStr)

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return '방금 업데이트'
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return formatDate(dateStr)
}

/**
 * USD 금액을 ₩ 표기로 변환. 환율은 lib/currency.ts 의 getKrwRate() 단일 SoT 사용.
 * @param usdAmount USD 금액(이미 toUsd 로 환산된 값이어야 함)
 * @param options.signed true 면 음수 입력 시 "-₩..." 로 부호를 보존(기본 false=절댓값 표기)
 */
export function formatKrw(
  usdAmount: number,
  options?: { signed?: boolean }
): string {
  const krw = Math.abs(usdAmount) * getKrwRate()
  const sign = options?.signed && usdAmount < 0 ? '-' : ''
  if (krw >= 1e12) return `${sign}${(krw / 1e12).toFixed(1)}조원`
  if (krw >= 1e8) return `${sign}${Math.round(krw / 1e8).toLocaleString()}억원`
  if (krw >= 1e4) return `${sign}${Math.round(krw / 1e4).toLocaleString()}만원`
  return `${sign}${Math.round(krw).toLocaleString()}원`
}

// 자금흐름액. 입력이 음수일 수 있으나 호출부가 부호(+/-)를 따로 붙이는 패턴이라
// USD·KRW 모두 절댓값 표기로 일치시킨다(formatKrw 기본 동작과 동일).
export function formatFlowAmount(
  amount: number,
  currency: Currency = 'USD'
): string {
  if (currency === 'KRW') return formatKrw(amount) // 절댓값·조/억/만원 압축
  const absAmount = Math.abs(amount)
  if (absAmount >= 1e12) {
    return `$${(absAmount / 1e12).toFixed(1)}T`
  }
  if (absAmount >= 1e9) {
    return `$${(absAmount / 1e9).toFixed(1)}B`
  }
  if (absAmount >= 1e6) {
    return `$${(absAmount / 1e6).toFixed(1)}M`
  }
  return `$${absAmount.toLocaleString()}`
}
