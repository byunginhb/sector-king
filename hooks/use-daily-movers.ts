'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, RegionFilter } from '@/types'
import type { DailyMoversResponse } from '@/app/api/statistics/movers/route'

interface UseDailyMoversOptions {
  region?: RegionFilter
  limit?: number
  /** 산업 스코프. 생략하면 전 종목. */
  industryId?: string
  /** 시총 하한(USD). 잡주를 띠에서 빼는 용도. */
  minMarketCapUsd?: number
}

/**
 * 가장 최근 영업일 기준 등락률 절댓값 상위 종목을 조회한다.
 *
 * - `usePriceChanges({ days: 1 })` 와 달리, 휴장일에 가격이 캐리된 한국 종목도
 *   `daily_snapshots.price_change` percent 컬럼을 사용하므로 0% 캐리 문제가 없다.
 */
export function useDailyMovers(options: UseDailyMoversOptions = {}) {
  const { region = 'all', limit = 30, industryId, minMarketCapUsd } = options

  return useQuery<DailyMoversResponse>({
    // 스코프가 키에 들어가야 산업 카드끼리 서로의 결과를 덮어쓰지 않는다.
    queryKey: ['daily-movers', region, limit, industryId ?? null, minMarketCapUsd ?? 0],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (region !== 'all') params.set('region', region)
      params.set('limit', String(limit))
      if (industryId) params.set('industry', industryId)
      if (minMarketCapUsd) params.set('minMarketCap', String(minMarketCapUsd))

      const res = await fetch(`/api/statistics/movers?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch daily movers')
      }

      const json: ApiResponse<DailyMoversResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to fetch daily movers')
      }

      return json.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
