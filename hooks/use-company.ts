'use client'

import { useQuery } from '@tanstack/react-query'
import type { CompanyDetailResponse, ApiResponse } from '@/types'

interface UseCompanyOptions {
  /** 가격 history 일수(옵셔널). 미지정 시 서버 기본(30일) — 기존 동작 보존. */
  range?: number
}

/**
 * `/api/company/[ticker]` — 모달·페이지 공용 base 응답.
 * `range` 미지정 시 기존 queryKey `['company', ticker]` 그대로 유지(호출부 무수정).
 */
export function useCompany(ticker: string, { range }: UseCompanyOptions = {}) {
  return useQuery<CompanyDetailResponse>({
    queryKey: range != null ? ['company', ticker, range] : ['company', ticker],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (range != null) params.set('range', String(range))
      const qs = params.toString()
      const url = `/api/company/${encodeURIComponent(ticker)}${qs ? `?${qs}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch company data')
      const json: ApiResponse<CompanyDetailResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
    enabled: !!ticker,
  })
}
