'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, CompanyInsightsResponse } from '@/types'

interface UseCompanyInsightsOptions {
  /** score_history 일수. 허용: 30 | 60 | 74 | 120. 미지정 시 서버 기본(74). */
  range?: number
}

/**
 * `/api/company/[ticker]/insights` — 페이지 전용 집계(peer/밸류에이션/시총점유율 + score_history).
 * 모달은 호출하지 않는다. queryKey 에 range 포함해 캐시 격리.
 */
export function useCompanyInsights(
  ticker: string,
  { range }: UseCompanyInsightsOptions = {}
) {
  return useQuery<CompanyInsightsResponse>({
    queryKey: ['company-insights', ticker, range ?? null],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (range != null) params.set('range', String(range))
      const qs = params.toString()
      const url = `/api/company/${encodeURIComponent(ticker)}/insights${qs ? `?${qs}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch company insights')
      const json: ApiResponse<CompanyInsightsResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error')
      }
      return json.data
    },
    enabled: !!ticker,
    staleTime: 1000 * 60 * 5,
  })
}
