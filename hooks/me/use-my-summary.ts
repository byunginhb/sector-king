/**
 * 메인 워치 PnL 요약 hook (M5).
 */
'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type {
  MySummaryDTO,
  MyWatchPnlItem,
} from '@/drizzle/supabase-schema'

interface SummaryResponse {
  summary: MySummaryDTO
  items: MyWatchPnlItem[]
}

const QUERY_KEY = ['me', 'summary'] as const

async function fetchSummary(): Promise<SummaryResponse> {
  const res = await fetch('/api/me/summary', { cache: 'no-store' })
  if (!res.ok) throw new Error(`요약을 불러올 수 없습니다 (${res.status})`)
  const json = (await res.json()) as ApiResponse<SummaryResponse>
  if (!json.success || !json.data) throw new Error(json.error ?? '응답 형식 오류')
  return json.data
}

export function useMySummary(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSummary,
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
