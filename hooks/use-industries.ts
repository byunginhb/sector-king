'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, IndustriesResponse, RegionFilter } from '@/types'

interface UseIndustriesOptions {
  region?: RegionFilter
}

export function useIndustries(options: UseIndustriesOptions = {}) {
  const { region = 'all' } = options

  return useQuery<IndustriesResponse>({
    queryKey: ['industries', region],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (region !== 'all') params.set('region', region)
      const qs = params.toString()
      const url = qs ? `/api/industries?${qs}` : '/api/industries'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch industries')
      const json: ApiResponse<IndustriesResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
    staleTime: 1000 * 60 * 10,
  })
}
