'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, PriceChangesResponse } from '@/types'

interface UsePriceChangesOptions {
  sort?: 'percentChange' | 'name' | 'marketCap'
  order?: 'asc' | 'desc'
  industryId?: string
}

export function usePriceChanges(options: UsePriceChangesOptions = {}) {
  const { sort = 'percentChange', order = 'desc', industryId } = options

  return useQuery<PriceChangesResponse>({
    queryKey: ['price-changes', sort, order, industryId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('sort', sort)
      params.set('order', order)
      if (industryId) params.set('industry', industryId)

      const res = await fetch(`/api/statistics/price-changes?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch price changes data')
      }

      const json: ApiResponse<PriceChangesResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to fetch price changes data')
      }

      return json.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
