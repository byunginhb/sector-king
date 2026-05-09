/**
 * 메모 hook.
 */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type { NoteDTO, PerkItemType } from '@/drizzle/supabase-schema'

interface ListResponse {
  items: NoteDTO[]
  total: number
}

interface UpsertInput {
  itemType: PerkItemType
  itemKey: string
  body: string
}

const QUERY_KEY = ['me', 'notes'] as const

async function fetchNotes(filter: {
  itemType?: PerkItemType
  itemKey?: string
}): Promise<ListResponse> {
  const params = new URLSearchParams()
  if (filter.itemType) params.set('itemType', filter.itemType)
  if (filter.itemKey) params.set('itemKey', filter.itemKey)
  const url = params.size > 0 ? `/api/me/notes?${params.toString()}` : '/api/me/notes'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`메모를 불러올 수 없습니다 (${res.status})`)
  const json = (await res.json()) as ApiResponse<ListResponse>
  if (!json.success || !json.data) throw new Error(json.error ?? '응답 형식 오류')
  return json.data
}

async function upsertNote(input: UpsertInput): Promise<NoteDTO> {
  const res = await fetch('/api/me/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as ApiResponse<{ item: NoteDTO }>
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? '저장 실패')
  }
  return json.data.item
}

async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/me/notes/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiResponse<never>
    throw new Error(json.error ?? '삭제 실패')
  }
}

export function useNotes(filter: { itemType?: PerkItemType; itemKey?: string; enabled?: boolean } = {}) {
  const { enabled = true, ...rest } = filter
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: [...QUERY_KEY, rest.itemType ?? 'all', rest.itemKey ?? 'all'],
    queryFn: () => fetchNotes(rest),
    enabled,
    staleTime: 30 * 1000,
  })

  const upsertMutation = useMutation({
    mutationFn: upsertNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['me', 'summary'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['me', 'summary'] })
    },
  })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upsert: upsertMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  }
}
