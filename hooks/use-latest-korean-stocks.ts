'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type { NoviceKoreanStockItem } from '@/drizzle/supabase-schema'

export interface LatestKoreanStocks {
  reportId: string
  reportTitle: string
  reportDate: string
  publishedAt: string | null
  picks: NoviceKoreanStockItem[]
}

async function fetchLatestKoreanStocks(): Promise<LatestKoreanStocks | null> {
  const res = await fetch('/api/news/latest-korean-stocks', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`추천 한국 종목을 불러올 수 없습니다 (${res.status})`)
  }
  const json = (await res.json()) as ApiResponse<LatestKoreanStocks | null>
  if (!json.success) throw new Error(json.error ?? '응답 형식 오류')
  return json.data ?? null
}

export function useLatestKoreanStocks() {
  return useQuery({
    queryKey: ['news', 'latest-korean-stocks'],
    queryFn: fetchLatestKoreanStocks,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
