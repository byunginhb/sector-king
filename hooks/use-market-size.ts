'use client'

import { useQuery } from '@tanstack/react-query'
import type { MarketSizeResponse, ApiResponse, RegionFilter } from '@/types'

interface UseMarketSizeOptions {
  region?: RegionFilter
  /** 산업 필터. null/undefined = 전체 */
  industryId?: string | null
}

/**
 * 카테고리별 시장 규모 스냅샷.
 * region·industry 는 데이터를 거르므로 queryKey 에 포함. (통화는 표시 전용이라 미포함)
 */
export function useMarketSize({ region = 'all', industryId = null }: UseMarketSizeOptions = {}) {
  return useQuery<MarketSizeResponse>({
    queryKey: ['market-size', region, industryId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (region !== 'all') params.set('region', region)
      if (industryId) params.set('industry', industryId)
      const qs = params.toString()
      const res = await fetch(`/api/market-size${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch market size')
      const json: ApiResponse<MarketSizeResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error')
      }
      return json.data
    },
  })
}
