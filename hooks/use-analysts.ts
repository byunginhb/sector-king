'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, AnalystLeaderboardResponse } from '@/types'

/**
 * `/api/analysts` — 애널리스트 방향 적중률 랭킹.
 * 통화 무관(비율/카운트)이라 통화 토글과 무관. queryKey 단순.
 */
export function useAnalysts() {
  return useQuery<AnalystLeaderboardResponse>({
    queryKey: ['analysts', 'leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/analysts')
      if (!res.ok) throw new Error('애널리스트 랭킹을 불러오지 못했습니다')
      const json: ApiResponse<AnalystLeaderboardResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error ?? '데이터 없음')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
