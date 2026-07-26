/**
 * GET /api/analysts — 애널리스트 방향 적중률 랭킹.
 * Supabase(리포트) + SQLite(주가) 서버 조인·집계. 값은 비율/카운트(통화 무관).
 */
import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/analyst-consensus/queries'
import type { ApiResponse, AnalystLeaderboardResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<ApiResponse<AnalystLeaderboardResponse>>> {
  try {
    const data = await getLeaderboard()
    // 데이터는 하루 1회 크롤 갱신 → CDN 캐시로 콜드 히트 전량 조인 부담 완화.
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('[analysts] 랭킹 로드 실패:', e)
    return NextResponse.json({ success: false, error: '애널리스트 랭킹을 불러오지 못했습니다' }, { status: 500 })
  }
}
