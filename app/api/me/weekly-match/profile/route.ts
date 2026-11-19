import { NextResponse } from 'next/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { createClient } from '@/lib/supabase/server'
import { publicProfileSchema } from '@/lib/weekly-match/ranking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
const columns = 'nickname,is_public'
const dto = (row: { nickname: string; is_public: boolean }) => ({ nickname: row.nickname, isPublic: row.is_public })
async function guardUser() {
  const guard = await requireUserApi()
  if (!guard.ok) Object.entries(headers).forEach(([key, value]) => guard.response.headers.set(key, value))
  return guard
}
export async function GET() {
  try {
    const guard = await guardUser()
    if (!guard.ok) return guard.response
    const { data, error } = await (await createClient()).from('weekly_match_public_profiles').select(columns).eq('user_id', guard.profile.id).maybeSingle()
    if (error) throw error
    return NextResponse.json({ success: true, data: { profile: data ? dto(data) : null } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '내 순위 공개 설정을 불러올 수 없습니다' }, { status: 503, headers })
  }
}
export async function PUT(req: Request) {
  try {
    const guard = await guardUser()
    if (!guard.ok) return guard.response
    const parsed = publicProfileSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, error: '별명은 한글·영문·숫자·공백·_·-로 2~16자이며 공개 여부를 선택해야 합니다' }, { status: 400, headers })
    const { data, error } = await (await createClient()).from('weekly_match_public_profiles').upsert({ user_id: guard.profile.id, nickname: parsed.data.nickname, is_public: parsed.data.isPublic, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select(columns).single()
    if (error?.code === '23505') return NextResponse.json({ success: false, error: '이미 사용 중인 별명입니다' }, { status: 409, headers })
    if (error || !data) throw new Error('PROFILE_WRITE_FAILED')
    return NextResponse.json({ success: true, data: { profile: dto(data) } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '순위 공개 설정을 저장할 수 없습니다' }, { status: 503, headers })
  }
}
