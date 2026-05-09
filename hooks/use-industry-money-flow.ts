'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, IndustryMoneyFlowResponse, RegionFilter } from '@/types'

interface UseIndustryMoneyFlowOptions {
  period?: number
  enabled?: boolean
  region?: RegionFilter
}

export function useIndustryMoneyFlow(options: UseIndustryMoneyFlowOptions = {}) {
  const { period = 14, enabled = true, region = 'all' } = options

  return useQuery({
    queryKey: ['industry-money-flow', period, region],
    queryFn: async () => {
      const params = new URLSearchParams({ period: period.toString() })
      if (region !== 'all') params.set('region', region)
      const response = await fetch(`/api/statistics/money-flow/industries?${params}`)
      if (!response.ok) throw new Error('Failed to fetch industry money flow data')

      const data: ApiResponse<IndustryMoneyFlowResponse> = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch industry money flow data')
      }

      return data.data
    },
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}
