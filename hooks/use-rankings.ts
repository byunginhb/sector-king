'use client'

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, RegionFilter } from '@/types'
import type { RankingsResponse } from '@/app/api/rankings/route'
import type { RankingHorizon, RankingSortDir } from '@/lib/api-helpers'

export type RankingSortKey =
  | 'short'
  | 'long'
  | 'name'
  | 'rec'
  | 'target'
  | 'upside'
  | 'roe'
  | 'margin'
  | 'pe'
  | 'marketcap'
  | 'dcf'
  | 'dcfUpside'

interface UseRankingsOptions {
  industryId?: string
  region?: RegionFilter
  /** 부각 점수축(단기/장기). 정렬 키 미지정 시 이 점수로 정렬. */
  horizon?: RankingHorizon
  /** 다축 정렬 키(목표가/ROE 등). 미지정 시 horizon. */
  sortKey?: RankingSortKey
  sort?: RankingSortDir
  limit?: number
  /** SSR 초기 데이터 — 기본 뷰일 때만 전달(첫 HTML 부터 표가 채워짐, 크롤러·AI 대응). */
  initialData?: RankingsResponse
}

/**
 * `/api/rankings` — 단기/장기 점수 랭킹.
 *
 * queryKey 에 industry/region/horizon/sortKey/sort/limit 전부 포함 → 토글 시 캐시 격리.
 * **통화 토글(₩/$)은 queryKey 에 넣지 않는다**(표시 레이어. 응답은 항상 USD).
 */
export function useRankings(options: UseRankingsOptions = {}) {
  const {
    industryId,
    region = 'all',
    horizon = 'long',
    sortKey,
    sort = 'desc',
    limit = 50,
    initialData,
  } = options

  return useQuery<RankingsResponse>({
    queryKey: [
      'rankings',
      industryId ?? null,
      region,
      horizon,
      sortKey ?? horizon,
      sort,
      limit,
    ],
    initialData,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (industryId) params.set('industry', industryId)
      if (region !== 'all') params.set('region', region)
      params.set('horizon', horizon)
      if (sortKey) params.set('sortKey', sortKey)
      params.set('sort', sort)
      params.set('limit', String(limit))

      const res = await fetch(`/api/rankings?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch rankings')
      const json: ApiResponse<RankingsResponse> = await res.json()
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error')
      }
      return json.data
    },
  })
}
