import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, MoneyFlowResponse } from '@/types'

interface UseMoneyFlowOptions {
  period?: number
  limit?: number
}

export function useMoneyFlow(options: UseMoneyFlowOptions = {}) {
  const { period = 14, limit = 6 } = options

  return useQuery({
    queryKey: ['money-flow', period, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: period.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/statistics/money-flow?${params}`)
      const data: ApiResponse<MoneyFlowResponse> = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch money flow data')
      }

      return data.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
