'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, MoneyFlowResponse, RegionFilter } from '@/types'

interface UseMoneyFlowOptions {
  period?: number
  limit?: number
  industryId?: string
  region?: RegionFilter
}

export function useMoneyFlow(options: UseMoneyFlowOptions = {}) {
  const { period = 14, limit = 6, industryId, region = 'all' } = options

  return useQuery({
    queryKey: ['money-flow', period, limit, industryId, region],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
        limit: limit.toString(),
      })
      if (industryId) params.set('industry', industryId)
      if (region !== 'all') params.set('region', region)

      const response = await fetch(`/api/statistics/money-flow?${params}`)
      if (!response.ok) throw new Error('Failed to fetch money flow data')
      const data: ApiResponse<MoneyFlowResponse> = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch money flow data')
      }

      return data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
