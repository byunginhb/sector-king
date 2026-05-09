/**
 * 이메일 구독 hook (M4).
 *
 * RESEND_API_KEY 미설정 → subscription.emailEnabled === false → UI 비활성.
 */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type { EmailSubscriptionDTO } from '@/drizzle/supabase-schema'

interface PatchInput {
  dailyReport?: boolean
  hourKst?: number
}

const QUERY_KEY = ['me', 'email-subscription'] as const

async function fetchSubscription(): Promise<EmailSubscriptionDTO> {
  const res = await fetch('/api/me/email-subscription', { cache: 'no-store' })
  if (!res.ok)
    throw new Error(`구독 정보를 불러올 수 없습니다 (${res.status})`)
  const json = (await res.json()) as ApiResponse<{
    subscription: EmailSubscriptionDTO
  }>
  if (!json.success || !json.data) throw new Error(json.error ?? '응답 형식 오류')
  return json.data.subscription
}

async function patchSubscription(input: PatchInput): Promise<EmailSubscriptionDTO> {
  const res = await fetch('/api/me/email-subscription', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as ApiResponse<{
    subscription: EmailSubscriptionDTO
  }>
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? '저장 실패')
  }
  return json.data.subscription
}

export function useEmailSubscription(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSubscription,
    enabled,
    staleTime: 60 * 1000,
  })

  const patchMutation = useMutation({
    mutationFn: patchSubscription,
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data)
    },
  })

  return {
    subscription: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: patchMutation.mutateAsync,
    isPending: patchMutation.isPending,
  }
}
