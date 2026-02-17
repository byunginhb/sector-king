'use client'

import { useQuery } from '@tanstack/react-query'
import type { MapResponse, ApiResponse } from '@/types'

interface UseMapDataOptions {
  date?: string | null
  industryId?: string
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { date, industryId } = options

  return useQuery<MapResponse>({
    queryKey: ['map', date, industryId],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (industryId) params.set('industry', industryId)
      const qs = params.toString()
      const url = qs ? `/api/map?${qs}` : '/api/map'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch map data')
      const json: ApiResponse<MapResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
