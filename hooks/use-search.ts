'use client'

import { useQuery } from '@tanstack/react-query'
import { useDebounce } from './use-debounce'
import type { ApiResponse, SearchResponse } from '@/types'

interface UseSearchOptions {
  query: string
  limit?: number
}

export function useSearch({ query, limit = 10 }: UseSearchOptions) {
  const debouncedQuery = useDebounce(query, 300)

  return useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: String(limit),
      })
      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error('검색에 실패했습니다')
      const json: ApiResponse<SearchResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || '검색 오류')
      return json.data
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 1000 * 60 * 5,
  })
}
