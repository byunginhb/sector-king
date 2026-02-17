'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, SectorTrendResponse } from '@/types'

interface UseSectorTrendOptions {
  industryId?: string
}

export function useSectorTrend(options: UseSectorTrendOptions = {}) {
  const { industryId } = options

  return useQuery({
    queryKey: ['sector-trend', industryId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (industryId) params.set('industry', industryId)
      const qs = params.toString()
      const url = qs
        ? `/api/statistics/sector-trend?${qs}`
        : '/api/statistics/sector-trend'

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch sector trend data')
      }

      const data: ApiResponse<SectorTrendResponse> = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sector trend data')
      }

      return data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
