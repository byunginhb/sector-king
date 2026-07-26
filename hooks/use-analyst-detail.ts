'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, AnalystDetailResponse } from '@/types'

/**
 * `/api/analysts/[id]` — 애널리스트 상세(종목별 목표가 vs 실제 + 겹쳐보기).
 * 응답 가격은 USD. 통화 토글은 표시 레이어(queryKey 미포함).
 */
export function useAnalystDetail(analystId: number | null) {
  return useQuery<AnalystDetailResponse>({
    queryKey: ['analysts', 'detail', analystId],
    enabled: analystId != null && analystId > 0,
    queryFn: async () => {
      const res = await fetch(`/api/analysts/${analystId}`)
      if (!res.ok) throw new Error('애널리스트 상세를 불러오지 못했습니다')
      const json: ApiResponse<AnalystDetailResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error ?? '데이터 없음')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
