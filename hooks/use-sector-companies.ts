'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, SectorCompaniesResponse, RegionFilter } from '@/types'

interface UseSectorCompaniesOptions {
  sectorId: string | null
  period?: number
  region?: RegionFilter
}

export function useSectorCompanies(options: UseSectorCompaniesOptions) {
  const { sectorId, period = 14, region = 'all' } = options

  return useQuery({
    // region 은 캐시 키에만 포함 (이 라우트는 sector 내부 회사 목록을 반환하므로
    // 서버 region 분기는 구현되지 않았지만, 동일 sector 라도 region 전환 시
    // 다른 컨텍스트로 인식되도록 격리)
    queryKey: ['sector-companies', sectorId, period, region],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
      })
      if (region !== 'all') params.set('region', region)

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
