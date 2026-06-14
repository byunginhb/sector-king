'use client'

import { useMemo } from 'react'
import {
  formatMarketCap,
  formatPrice,
  formatPriceCompact,
  formatFlowAmount,
} from '@/lib/format'
import { type Currency } from '@/lib/currency'
import { useCurrency } from '@/hooks/use-currency'

export interface CurrencyFormat {
  marketCap: (usd: number | null | undefined) => string
  price: (usd: number | null) => string
  priceCompact: (usd: number | null | undefined) => string
  flowAmount: (usd: number) => string
  /** 차트 formatter 클로저 구성·조건 분기용 노출 */
  currency: Currency
}

/**
 * 현재 표시 통화를 자동 주입하는 포맷 훅. 컴포넌트는 currency 를 prop drilling 하지 않고
 * fmt.marketCap(usd) 식으로 호출한다. 입력은 항상 USD.
 * useMemo([currency]) 이므로 통화 변경 시에만 formatter 가 재구성된다(차트 클로저 안정).
 */
export function useCurrencyFormat(): CurrencyFormat {
  const { currency } = useCurrency()
  return useMemo<CurrencyFormat>(
    () => ({
      marketCap: (v) => formatMarketCap(v, currency),
      price: (v) => formatPrice(v, currency),
      priceCompact: (v) => formatPriceCompact(v, currency),
      flowAmount: (v) => formatFlowAmount(v, currency),
      currency,
    }),
    [currency]
  )
}
