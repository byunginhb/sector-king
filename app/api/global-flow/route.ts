import { NextResponse } from 'next/server'
import { getGlobalFlow } from '@/lib/global-flow/server'
import type { GlobalFlowPayload } from '@/lib/global-flow/compute'
import type { ApiResponse } from '@/types'

export const revalidate = 3600

/** 글로벌 자금 지도 — 4개 기간을 한 번에 돌려준다. 금액은 전부 USD(이미 환산됨). */
export async function GET(): Promise<NextResponse<ApiResponse<GlobalFlowPayload>>> {
  const data = await getGlobalFlow()
  if (!data) {
    return NextResponse.json(
      { success: false, error: '글로벌 자금 데이터가 아직 준비되지 않았습니다' },
      { status: 503 },
    )
  }
  return NextResponse.json({ success: true, data })
}
