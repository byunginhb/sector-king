'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  MarketCapHistoryResponse,
  ApiResponse,
  RegionFilter,
} from '@/types'

interface UseMarketCapHistoryOptions {
  region?: RegionFilter
  /** 거래일 수 (7~120). 기본 90. */
  range?: number
  /** 모달이 열렸을 때만 fetch 하도록 제어. */
  enabled?: boolean
}

/**
 * 추적 종목 시총 일자별 추이.
 * region·range 는 데이터를 거르므로 queryKey 에 포함. (통화는 표시 전용이라 미포함)
 */
export function useMarketCapHistory({
  region = 'all',
  range = 90,
  enabled = true,
}: UseMarketCapHistoryOptions = {}) {
  return useQuery<MarketCapHistoryResponse>({
    queryKey: ['market-cap-history', region, range],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (region !== 'all') params.set('region', region)
      params.set('range', String(range))
      const res = await fetch(`/api/statistics/market-cap?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch market cap history')
      const json: ApiResponse<MarketCapHistoryResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error')
      }
      return json.data
    },
    enabled,
  })
}
