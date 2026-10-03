import { formatMarketCap, formatPrice, formatPriceChange } from '@/lib/format'
import { isKrTicker } from '@/lib/region'
import type { StockServerFacts } from '@/lib/stock-server'

/**
 * 종목 페이지 meta description — 검색 결과 스니펫에 실제 주가·시총을 싣는다.
 *
 * facts 의 가격성 필드는 이미 USD(toUsd 완료)다. 국내 종목은 검색자가 원화를 기대하므로
 * 포맷 단계에서만 원화로 표기한다(formatPrice/formatMarketCap 이 USD 입력을 받아 환산).
 */
export function buildStockDescription(displayName: string, facts: StockServerFacts): string {
  const currency = isKrTicker(facts.ticker) ? 'KRW' : 'USD'
  const parts: string[] = []
  if (facts.priceUsd !== null) {
    const change = facts.priceChangePct !== null ? `(${formatPriceChange(facts.priceChangePct)})` : ''
    parts.push(`주가 ${formatPrice(facts.priceUsd, currency)}${change}`)
  }
  if (facts.marketCapUsd) {
    parts.push(`시가총액 ${formatMarketCap(facts.marketCapUsd, currency)}`)
  }
  const numbers =
    parts.length > 0 ? ` ${parts.join(', ')}${facts.date ? ` — ${facts.date} 기준` : ''}.` : ''
  return `${displayName}(${facts.ticker})${numbers} 52주 최고·최저, 섹터 내 시총 순위, 성장성·수익성 점수와 애널리스트 목표주가를 한 페이지에서 확인하세요.`
}
