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
  industryId?: string
}

export function useCompanyStatistics(options: UseCompanyStatisticsOptions = {}) {
  const { sort = 'count', order = 'desc', page = 1, limit = 20, industryId } = options

  return useQuery<CompanyStatisticsResponse>({
    queryKey: ['statistics', 'companies', sort, order, page, limit, industryId],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams({
        sort,
        order,
        page: String(page),
        limit: String(limit),
      })
      if (industryId) params.set('industry', industryId)
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
  industryId?: string
}

interface TrendsResponseData extends TrendResponse {
  categories?: CategoryMarketCap[]
  sectorGrowth?: SectorGrowth[]
}

export function useTrends(options: UseTrendsOptions) {
  const { type, ids = [], days = '30', industryId } = options

  return useQuery<TrendsResponseData>({
    queryKey: ['statistics', 'trends', type, ids, days, industryId],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams({ type, days })
      if (ids.length > 0) {
        params.set('ids', ids.join(','))
      }
      if (industryId) params.set('industry', industryId)
      const res = await fetch(`/api/statistics/trends?${params}`)
      if (!res.ok) throw new Error('Failed to fetch trend data')
      const json: ApiResponse<TrendsResponseData> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
