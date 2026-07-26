/**
 * GET /api/analysts/stocks/[ticker] — 그 종목을 예측한 애널리스트들 비교.
 * 목표가/주가는 toUsd 후 응답. ticker 는 URL 인코딩(예: 000660.KS).
 */
import { NextResponse } from 'next/server'
import { getStockDetail } from '@/lib/analyst-consensus/queries'
import type { ApiResponse, AnalystStockDetailResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
): Promise<NextResponse<ApiResponse<AnalystStockDetailResponse>>> {
  const { ticker: raw } = await params
  const ticker = decodeURIComponent(raw)
  // KR 티커 형식 가드(6자리.KS/.KQ). 오염 방지.
  if (!/^\d{6}\.(KS|KQ)$/.test(ticker)) {
    return NextResponse.json({ success: false, error: '잘못된 종목 코드' }, { status: 400 })
  }
  try {
    const data = await getStockDetail(ticker)
    if (!data) {
      return NextResponse.json({ success: false, error: '해당 종목의 리포트가 없습니다' }, { status: 404 })
    }
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('[analysts/stocks/:ticker] 상세 로드 실패:', e)
    return NextResponse.json({ success: false, error: '종목 상세를 불러오지 못했습니다' }, { status: 500 })
  }
}
