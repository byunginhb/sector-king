import { NextResponse } from 'next/server'
import { getWeeklyMatchRounds } from '@/lib/weekly-match/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: { rounds: await getWeeklyMatchRounds() } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ success: false, error: '주간 매치를 불러올 수 없습니다' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
