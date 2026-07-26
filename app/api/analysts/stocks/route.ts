/**
 * GET /api/analysts/stocks — 애널리스트가 커버한 종목 목록(예측 애널 수 순).
 * 가격/컨센서스 목표가는 toUsd 후 응답.
 */
import { NextResponse } from 'next/server'
import { getStockList } from '@/lib/analyst-consensus/queries'
import type { ApiResponse, AnalystStockListResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<ApiResponse<AnalystStockListResponse>>> {
  try {
    const data = await getStockList()
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('[analysts/stocks] 목록 로드 실패:', e)
    return NextResponse.json({ success: false, error: '종목 목록을 불러오지 못했습니다' }, { status: 500 })
  }
}
