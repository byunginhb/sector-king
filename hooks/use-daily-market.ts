'use client'

import { useQuery } from '@tanstack/react-query'
import type { DailyMarketResponse, ApiResponse } from '@/types'

interface UseDailyMarketOptions {
  /** 기간 시작(YYYY-MM-DD). */
  start: string
  /** 기간 종료(YYYY-MM-DD). */
  end: string
  /** 자기 자신(현재 월간 리포트) 링크 방지용 제외 id. */
  excludeId?: string
  /** 월간 리포트일 때만 조회하도록 제어. */
  enabled?: boolean
}

/**
 * 월간 리포트 기간의 일별 시장 흐름(#28).
 * start/end 는 데이터를 거르므로 queryKey 에 포함.
 */
export function useDailyMarket({ start, end, excludeId, enabled = true }: UseDailyMarketOptions) {
  return useQuery<DailyMarketResponse>({
    queryKey: ['daily-market', start, end, excludeId ?? null],
    enabled: enabled && start !== '' && end !== '',
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const params = new URLSearchParams({ start, end })
      if (excludeId) params.set('excludeId', excludeId)
      const res = await fetch(`/api/reports/daily-market?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch daily market')
      const json: ApiResponse<DailyMarketResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
  })
}
