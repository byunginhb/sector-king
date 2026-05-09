'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  ApiResponse,
  CompanyStatisticsResponse,
  TrendResponse,
  CategoryMarketCap,
  SectorGrowth,
  RegionFilter,
} from '@/types'

interface UseCompanyStatisticsOptions {
  sort?: 'count' | 'marketCap' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  industryId?: string
  region?: RegionFilter
}

export function useCompanyStatistics(options: UseCompanyStatisticsOptions = {}) {
  const {
    sort = 'count',
    order = 'desc',
    page = 1,
    limit = 20,
    industryId,
    region = 'all',
  } = options

  return useQuery<CompanyStatisticsResponse>({
    queryKey: ['statistics', 'companies', sort, order, page, limit, industryId, region],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams({
        sort,
        order,
        page: String(page),
        limit: String(limit),
      })
      if (industryId) params.set('industry', industryId)
      if (region !== 'all') params.set('region', region)
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
  region?: RegionFilter
}

interface TrendsResponseData extends TrendResponse {
  categories?: CategoryMarketCap[]
  sectorGrowth?: SectorGrowth[]
}

export function useTrends(options: UseTrendsOptions) {
  const { type, ids = [], days = '30', industryId, region = 'all' } = options

  // 호출부가 매 렌더 새 배열을 만들어도 캐시 키가 흔들리지 않도록
  // 정렬된 문자열로 안정화한다. (queryKey/네트워크 요청 모두 동일 키 사용)
  const idsKey = ids.length > 0 ? [...ids].sort().join(',') : ''

  return useQuery<TrendsResponseData>({
    queryKey: ['statistics', 'trends', type, idsKey, days, industryId, region],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams({ type, days })
      if (idsKey) {
        params.set('ids', idsKey)
      }
      if (industryId) params.set('industry', industryId)
      if (region !== 'all') params.set('region', region)
      const res = await fetch(`/api/statistics/trends?${params}`)
      if (!res.ok) throw new Error('Failed to fetch trend data')
      const json: ApiResponse<TrendsResponseData> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
