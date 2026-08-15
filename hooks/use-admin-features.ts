'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminFeaturesPayload,
  SaveFeaturesInput,
} from '@/components/admin/permissions/types'
import type { ApiResponse } from '@/types'

/**
 * `/admin/permissions` 콘솔의 데이터 훅.
 *
 * 이 훅에는 **낙관적 업데이트가 없다.** 콘솔은 일괄 저장이고 draft(로컬 state)가
 * 곧 즉시 반영이라 화면은 이미 최신이다. 여기에 optimistic 을 또 얹으면 draft 와
 * 캐시 두 벌이 서로를 덮어쓰고, 실패 시 무엇으로 되돌릴지가 모호해진다.
 * **실패 시 롤백 = draft 를 건드리지 않는 것**이 이 화면의 롤백 전략이다.
 *
 * 정책은 통화·시세와 무관하므로 통화 토글과 queryKey 가 얽히지 않는다.
 */
export const ADMIN_FEATURES_KEY = ['admin', 'features'] as const

/** 409(동시 편집)에서 서버가 함께 준 현재 상태를 호출부까지 온전히 전달한다. */
export class AdminFeaturesError extends Error {
  readonly status: number
  readonly payload: AdminFeaturesPayload | null
  /** 400 에서 서버가 지목한 행. 해당 행을 danger 테두리로 표시한다. */
  readonly invalid: string[]

  constructor(
    message: string,
    status: number,
    payload: AdminFeaturesPayload | null,
    invalid: string[] = []
  ) {
    super(message)
    this.name = 'AdminFeaturesError'
    this.status = status
    this.payload = payload
    this.invalid = invalid
  }

  /** 다른 관리자가 먼저 저장한 상태. 배너 문구가 이 값으로 갈린다. */
  get isConflict(): boolean {
    return this.status === 409
  }
}

/** 400 은 `invalid`, 409 는 `data`(현재 서버 상태)를 함께 싣고 온다. */
type FeaturesResponse = ApiResponse<AdminFeaturesPayload> & {
  invalid?: string[]
}

async function readPayload(res: Response, fallback: string) {
  const json = (await res.json().catch(() => null)) as FeaturesResponse | null

  if (!res.ok || !json?.success || !json.data) {
    throw new AdminFeaturesError(
      json?.error ?? `${fallback} (${res.status})`,
      res.status,
      json?.data ?? null,
      json?.invalid ?? []
    )
  }
  return json.data
}

/**
 * 서버 컴포넌트가 이미 조회한 값을 `initialData` 로 받는다.
 * 콘솔은 `force-dynamic` 이라 그 값이 항상 최신이고, 첫 화면에서 스켈레톤이
 * 번쩍이지 않는다. 자동 재조회는 끈다 — 편집 중에 baseline 이 바뀌면
 * 미저장 변경의 기준선이 발밑에서 움직인다.
 */
export function useAdminFeatures(initialData: AdminFeaturesPayload) {
  return useQuery({
    queryKey: ADMIN_FEATURES_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/features', { cache: 'no-store' })
      return readPayload(res, '정책 목록을 불러오지 못했습니다')
    },
    initialData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  })
}

/** 일괄 저장. 성공 응답이 곧 새 baseline 이므로 캐시를 그 값으로 갈아끼운다. */
export function useSaveAdminFeatures() {
  const queryClient = useQueryClient()
  return useMutation<AdminFeaturesPayload, AdminFeaturesError, SaveFeaturesInput>({
    mutationFn: async (input) => {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      return readPayload(res, '저장하지 못했습니다')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_FEATURES_KEY, data)
    },
  })
}

/**
 * 오버라이드 단건 삭제 — 고아 행 수동 정리 전용.
 * 표에 있는 기능의 "기본값 되돌리기" 는 draft 를 거쳐 일괄 저장으로 나간다.
 */
export function useDeleteFeatureOverride() {
  const queryClient = useQueryClient()
  return useMutation<AdminFeaturesPayload, AdminFeaturesError, string>({
    mutationFn: async (featureId) => {
      const res = await fetch(
        `/api/admin/features/${encodeURIComponent(featureId)}`,
        { method: 'DELETE' }
      )
      return readPayload(res, '삭제하지 못했습니다')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_FEATURES_KEY, data)
    },
  })
}
