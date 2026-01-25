'use client'

import { useQuery } from '@tanstack/react-query'
import type { CompanyDetailResponse, ApiResponse } from '@/types'

export function useCompany(ticker: string) {
  return useQuery<CompanyDetailResponse>({
    queryKey: ['company', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/company/${encodeURIComponent(ticker)}`)
      if (!res.ok) throw new Error('Failed to fetch company data')
      const json: ApiResponse<CompanyDetailResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || 'Unknown error')
      return json.data
    },
    enabled: !!ticker,
  })
}
