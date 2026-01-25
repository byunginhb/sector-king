'use client'

import { useQuery } from '@tanstack/react-query'
import type { MapResponse, ApiResponse } from '@/types'

interface UseMapDataOptions {
  date?: string | null
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { date } = options

  return useQuery<MapResponse>({
    queryKey: ['map', date],
    queryFn: async () => {
      const url = date ? `/api/map?date=${date}` : '/api/map'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch map data')
      const json: ApiResponse<MapResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
