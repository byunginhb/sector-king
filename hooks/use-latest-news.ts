/**
 * 메인 화면에 최신 발행 마켓 리포트 1건을 가져오는 hook.
 *
 * 발행본 0건 → data.items.length === 0 → 호출부에서 미노출.
 */
'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type { NewsReportListItem } from '@/drizzle/supabase-schema'

interface NewsListResponse {
  items: NewsReportListItem[]
  total: number
}

async function fetchLatest(): Promise<NewsListResponse> {
  const res = await fetch('/api/news?limit=1', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`마켓 리포트를 불러올 수 없습니다 (${res.status})`)
  }
  const json = (await res.json()) as ApiResponse<NewsListResponse>
  if (!json.success || !json.data) {
    throw new Error(json.error ?? '응답 형식 오류')
  }
  return json.data
}

export function useLatestNews() {
  return useQuery({
    queryKey: ['news', 'latest'],
    queryFn: fetchLatest,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
