'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type {
  EconomicCalendarResponse,
  ApiResponse,
  CalendarCountry,
  CalendarCategory,
} from '@/types'

interface UseEconomicCalendarOptions {
  /** 'YYYY-MM-DD' (필수, 캘린더 컴포넌트가 view/이동으로 계산해 주입) */
  from: string
  /** 'YYYY-MM-DD' */
  to: string
  /** 기본 'all' */
  country?: CalendarCountry
  /** 기본 'all' */
  category?: CalendarCategory
}

/**
 * 경제 캘린더 조회. range·country·category 는 데이터를 거르므로 전부 queryKey 에 포함(캐시 격리).
 * 각 월/주가 독립 캐시 엔트리 → ◀▶ 재이동 시 캐시 히트. keepPreviousData 로 로딩 중 깜빡임 방지.
 */
export function useEconomicCalendar({
  from,
  to,
  country = 'all',
  category = 'all',
}: UseEconomicCalendarOptions) {
  return useQuery<EconomicCalendarResponse>({
    queryKey: ['economic-calendar', from, to, country, category],
    enabled: Boolean(from) && Boolean(to), // range 확정 전엔 미실행
    placeholderData: keepPreviousData, // 범위 이동 중 이전 그리드 유지
    staleTime: 5 * 60_000, // 5분(서버 revalidate 30분과 병행)
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('from', from)
      params.set('to', to)
      // 기본값(all)은 생략 — use-market-size 패턴.
      if (country !== 'all') params.set('country', country)
      if (category !== 'all') params.set('category', category)

      const res = await fetch(`/api/economic-calendar?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch economic calendar')
      const json: ApiResponse<EconomicCalendarResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error')
      }
      return json.data
    },
  })
}
