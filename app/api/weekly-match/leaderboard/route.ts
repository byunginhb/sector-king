import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { leaderboardSchema } from '@/lib/weekly-match/ranking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
export async function GET() {
  try {
    const { data, error } = await createAdminClient().rpc('weekly_match_leaderboard')
    if (error) throw error
    const leaderboard = leaderboardSchema.parse(data)
    return NextResponse.json({ success: true, data: { leaderboard } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '섹터 매치 순위를 불러올 수 없습니다' }, { status: 503, headers })
  }
}
