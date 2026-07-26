/**
 * GET /api/analysts/[id] — 애널리스트 상세(종목별 목표가 vs 실제 + 겹쳐보기).
 * 가격/목표가는 toUsd 후 응답. id 는 analysts.id(숫자).
 */
import { NextResponse } from 'next/server'
import { getAnalystDetail } from '@/lib/analyst-consensus/queries'
import type { ApiResponse, AnalystDetailResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<AnalystDetailResponse>>> {
  const { id } = await params
  const analystId = Number(id)
  if (!Number.isInteger(analystId) || analystId <= 0) {
    return NextResponse.json({ success: false, error: '잘못된 애널리스트 ID' }, { status: 400 })
  }
  try {
    const data = await getAnalystDetail(analystId)
    if (!data) {
      return NextResponse.json({ success: false, error: '애널리스트를 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('[analysts/:id] 상세 로드 실패:', e)
    return NextResponse.json({ success: false, error: '애널리스트 상세를 불러오지 못했습니다' }, { status: 500 })
  }
}
