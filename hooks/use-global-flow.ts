import { useQuery } from '@tanstack/react-query'
import type { GlobalFlowPayload } from '@/lib/global-flow/compute'
import type { ApiResponse } from '@/types'

export function useGlobalFlow(initialData?: GlobalFlowPayload | null) {
  return useQuery<GlobalFlowPayload>({
    queryKey: ['global-flow'],
    staleTime: 1000 * 60 * 10,
    // SSR 로 받은 값이 있으면 첫 렌더부터 채운다(크롤러·AI 가 본문을 읽게).
    initialData: initialData ?? undefined,
    queryFn: async () => {
      const res = await fetch('/api/global-flow')
      if (!res.ok) throw new Error('글로벌 자금 데이터를 불러오지 못했습니다')
      const json: ApiResponse<GlobalFlowPayload> = await res.json()
      if (!json.success || !json.data) throw new Error(json.error || '알 수 없는 오류')
      return json.data
    },
  })
}
