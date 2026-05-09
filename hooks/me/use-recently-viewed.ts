/**
 * 최근 본 종목 hook.
 */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type {
  RecentlyViewedItemDTO,
  PerkItemType,
} from '@/drizzle/supabase-schema'

interface ListResponse {
  items: RecentlyViewedItemDTO[]
  total: number
}

interface TrackInput {
  itemType: PerkItemType
  itemKey: string
  displayName?: string | null
}

const QUERY_KEY = ['me', 'recently-viewed'] as const

async function fetchRecently(limit: number): Promise<ListResponse> {
  const res = await fetch(`/api/me/recently-viewed?limit=${limit}`, {
    cache: 'no-store',
  })
  if (!res.ok)
    throw new Error(`최근 본 종목을 불러올 수 없습니다 (${res.status})`)
  const json = (await res.json()) as ApiResponse<ListResponse>
  if (!json.success || !json.data) throw new Error(json.error ?? '응답 형식 오류')
  return json.data
}

async function postRecently(input: TrackInput): Promise<RecentlyViewedItemDTO> {
  const res = await fetch('/api/me/recently-viewed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as ApiResponse<{
    item: RecentlyViewedItemDTO
  }>
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? '기록 실패')
  }
  return json.data.item
}

export function useRecentlyViewed(options: { limit?: number; enabled?: boolean } = {}) {
  const { limit = 20, enabled = true } = options
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: [...QUERY_KEY, limit],
    queryFn: () => fetchRecently(limit),
    enabled,
    staleTime: 30 * 1000,
  })

  const trackMutation = useMutation({
    mutationFn: postRecently,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    track: trackMutation.mutateAsync,
  }
}
