import { NextResponse } from 'next/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { createClient } from '@/lib/supabase/server'
import { ENTRY_COLUMNS } from '@/lib/weekly-match/server'
import { pickSchema } from '@/lib/weekly-match/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
const entryDto = (entry: { round_id: string; side: 'left' | 'right'; updated_at: string }) => ({ roundId: entry.round_id, side: entry.side, updatedAt: entry.updated_at })

export async function GET() {
  try {
    const guard = await requireUserApi()
    if (!guard.ok) {
      Object.entries(headers).forEach(([key, value]) => guard.response.headers.set(key, value))
      return guard.response
    }
    const supabase = await createClient()
    const { data, error } = await supabase.from('weekly_match_entries').select(ENTRY_COLUMNS).eq('user_id', guard.profile.id).order('updated_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: { entries: (data ?? []).map(entryDto) } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '내 선택을 불러올 수 없습니다' }, { status: 503, headers })
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireUserApi()
    if (!guard.ok) {
      Object.entries(headers).forEach(([key, value]) => guard.response.headers.set(key, value))
      return guard.response
    }
    const parsed = pickSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, error: '선택 입력이 올바르지 않습니다' }, { status: 400, headers })
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('submit_weekly_match_pick', { p_round_id: parsed.data.roundId, p_side: parsed.data.side })
    if (error) {
      if (error.message === 'AUTH_REQUIRED') return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401, headers })
      if (error.message === 'ROUND_CLOSED' || error.message === 'ROUND_UNAVAILABLE') {
        return NextResponse.json({ success: false, error: '현재 선택을 저장할 수 없는 라운드입니다' }, { status: 409, headers })
      }
      throw error
    }
    if (!data) throw new Error('EMPTY_ENTRY')
    return NextResponse.json({ success: true, data: { entry: entryDto(data) } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '선택을 저장할 수 없습니다' }, { status: 503, headers })
  }
}
