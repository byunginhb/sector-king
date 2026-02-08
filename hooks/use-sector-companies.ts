import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, SectorCompaniesResponse } from '@/types'

interface UseSectorCompaniesOptions {
  sectorId: string | null
  period?: number
}

export function useSectorCompanies(options: UseSectorCompaniesOptions) {
  const { sectorId, period = 14 } = options

  return useQuery({
    queryKey: ['sector-companies', sectorId, period],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
      })

      const response = await fetch(
        `/api/statistics/money-flow/${sectorId}/companies?${params}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch sector companies`)
      }

      const data: ApiResponse<SectorCompaniesResponse> = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sector companies')
      }

      return data.data
    },
    enabled: !!sectorId,
    staleTime: 1000 * 60 * 5,
  })
}
