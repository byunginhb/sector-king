'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  ApiResponse,
  AnalystStockListResponse,
  AnalystStockDetailResponse,
} from '@/types'

/** `/api/analysts/stocks` — 커버 종목 목록(예측 애널 수 순). */
export function useAnalystStocks() {
  return useQuery<AnalystStockListResponse>({
    queryKey: ['analysts', 'stocks'],
    queryFn: async () => {
      const res = await fetch('/api/analysts/stocks')
      if (!res.ok) throw new Error('종목 목록을 불러오지 못했습니다')
      const json: ApiResponse<AnalystStockListResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error ?? '데이터 없음')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** `/api/analysts/stocks/[ticker]` — 그 종목 예측 애널리스트 비교. */
export function useAnalystStockDetail(ticker: string | null) {
  return useQuery<AnalystStockDetailResponse>({
    queryKey: ['analysts', 'stock-detail', ticker],
    enabled: ticker != null && ticker.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/analysts/stocks/${encodeURIComponent(ticker!)}`)
      if (!res.ok) throw new Error('종목 상세를 불러오지 못했습니다')
      const json: ApiResponse<AnalystStockDetailResponse> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error ?? '데이터 없음')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
