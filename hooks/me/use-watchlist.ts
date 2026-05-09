/**
 * 워치리스트 hook — 본인 항목 조회 + add/remove/toggle mutation.
 *
 * 인증 안 됐을 때 호출하면 401 → React Query 가 error 상태로 노출.
 * 호출부에서 `enabled: !!profile` 처럼 가드 권장.
 */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type {
  WatchlistItemDTO,
  WatchlistItemType,
} from '@/drizzle/supabase-schema'

interface ListResponse {
  items: WatchlistItemDTO[]
  total: number
}

interface AddInput {
  itemType: WatchlistItemType
  itemKey: string
  displayName?: string | null
  note?: string | null
  pinned?: boolean
}

interface UseWatchlistOptions {
  itemType?: WatchlistItemType
  enabled?: boolean
}

const QUERY_KEY = ['me', 'watchlist'] as const

async function fetchWatchlist(
  itemType?: WatchlistItemType
): Promise<ListResponse> {
  const url = itemType ? `/api/me/watchlist?itemType=${itemType}` : '/api/me/watchlist'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`워치리스트를 불러올 수 없습니다 (${res.status})`)
  const json = (await res.json()) as ApiResponse<ListResponse>
  if (!json.success || !json.data) throw new Error(json.error ?? '응답 형식 오류')
  return json.data
}

async function postWatchlist(input: AddInput): Promise<WatchlistItemDTO> {
  const res = await fetch('/api/me/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as ApiResponse<{ item: WatchlistItemDTO }>
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? '추가 실패')
  }
  return json.data.item
}

async function deleteWatchlist(id: string): Promise<void> {
  const res = await fetch(`/api/me/watchlist/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiResponse<never>
    throw new Error(json.error ?? '삭제 실패')
  }
}

export function useWatchlist(options: UseWatchlistOptions = {}) {
  const { itemType, enabled = true } = options
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: [...QUERY_KEY, itemType ?? 'all'],
    queryFn: () => fetchWatchlist(itemType),
    enabled,
    staleTime: 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: postWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['me', 'summary'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: deleteWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['me', 'summary'] })
    },
  })

  function isWatched(type: WatchlistItemType, key: string) {
    const items = query.data?.items ?? []
    return items.some((i) => i.itemType === type && i.itemKey === key)
  }

  function findItem(type: WatchlistItemType, key: string) {
    return (query.data?.items ?? []).find(
      (i) => i.itemType === type && i.itemKey === key
    )
  }

  async function toggle(input: AddInput): Promise<{ added: boolean }> {
    const existing = findItem(input.itemType, input.itemKey)
    if (existing) {
      await removeMutation.mutateAsync(existing.id)
      return { added: false }
    }
    await addMutation.mutateAsync(input)
    return { added: true }
  }

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    add: addMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    toggle,
    isWatched,
    findItem,
  }
}
