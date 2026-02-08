import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, SectorTrendResponse } from '@/types'

export function useSectorTrend() {
  return useQuery({
    queryKey: ['sector-trend'],
    queryFn: async () => {
      const response = await fetch('/api/statistics/sector-trend')

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
