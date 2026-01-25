'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  ApiResponse,
  CompanyStatisticsResponse,
  TrendResponse,
  CategoryMarketCap,
  SectorGrowth,
} from '@/types'

interface UseCompanyStatisticsOptions {
  sort?: 'count' | 'marketCap' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export function useCompanyStatistics(options: UseCompanyStatisticsOptions = {}) {
  const { sort = 'count', order = 'desc', page = 1, limit = 20 } = options

  return useQuery<CompanyStatisticsResponse>({
    queryKey: ['statistics', 'companies', sort, order, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort,
        order,
        page: String(page),
        limit: String(limit),
      })
      const res = await fetch(`/api/statistics/companies?${params}`)
      if (!res.ok) throw new Error('Failed to fetch company statistics')
      const json: ApiResponse<CompanyStatisticsResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}

interface UseTrendsOptions {
  type: 'sector' | 'category' | 'company'
  ids?: string[]
  days?: '7' | '30' | 'all'
}

interface TrendsResponseData extends TrendResponse {
  categories?: CategoryMarketCap[]
  sectorGrowth?: SectorGrowth[]
}

export function useTrends(options: UseTrendsOptions) {
  const { type, ids = [], days = '30' } = options

  return useQuery<TrendsResponseData>({
    queryKey: ['statistics', 'trends', type, ids, days],
    queryFn: async () => {
      const params = new URLSearchParams({ type, days })
      if (ids.length > 0) {
        params.set('ids', ids.join(','))
      }
      const res = await fetch(`/api/statistics/trends?${params}`)
      if (!res.ok) throw new Error('Failed to fetch trend data')
      const json: ApiResponse<TrendsResponseData> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
