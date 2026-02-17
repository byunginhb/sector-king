'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, IndustriesResponse } from '@/types'

export function useIndustries() {
  return useQuery<IndustriesResponse>({
    queryKey: ['industries'],
    queryFn: async () => {
      const res = await fetch('/api/industries')
      if (!res.ok) throw new Error('Failed to fetch industries')
      const json: ApiResponse<IndustriesResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
    staleTime: 1000 * 60 * 10,
  })
}
