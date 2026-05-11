'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, RegionFilter } from '@/types'
import type { DailyMoversResponse } from '@/app/api/statistics/movers/route'

interface UseDailyMoversOptions {
  region?: RegionFilter
  limit?: number
}

/**
 * 가장 최근 영업일 기준 등락률 절댓값 상위 종목을 조회한다.
 *
 * - `usePriceChanges({ days: 1 })` 와 달리, 휴장일에 가격이 캐리된 한국 종목도
 *   `daily_snapshots.price_change` percent 컬럼을 사용하므로 0% 캐리 문제가 없다.
 */
export function useDailyMovers(options: UseDailyMoversOptions = {}) {
  const { region = 'all', limit = 30 } = options

  return useQuery<DailyMoversResponse>({
    queryKey: ['daily-movers', region, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (region !== 'all') params.set('region', region)
      params.set('limit', String(limit))

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
