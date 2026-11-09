import 'server-only'
import { NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/auth/require-api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import { roundSchema, syncSchema } from '@/lib/weekly-match/validation'
import { calculateSettlement, semanticHash } from '@/lib/weekly-match/settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(req: Request) {
  const guard = requireApiKey(req, 'CRON_SECRET')
  if (!guard.ok) {
    guard.response.headers.set('Cache-Control', headers['Cache-Control'])
    return guard.response
  }
  const parsed = syncSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: '운영 입력이 올바르지 않습니다' }, { status: 400, headers })
  try {
    const admin = createAdminClient()
    const input = parsed.data
    if (input.operation === 'publish') {
      const { data, error } = await admin.rpc('publish_weekly_match', { p_round: input.round })
      if (error) {
        if (error.message === 'ROUND_IMMUTABLE' || error.message === 'INVALID_ROUND_WINDOW') return NextResponse.json({ success: false, error: '게시된 라운드는 변경하거나 마감 후 게시할 수 없습니다' }, { status: 409, headers })
        throw error
      }
      return NextResponse.json({ success: true, data: { roundId: data } }, { headers })
    }
    const { data: round, error: readError } = await admin.from('weekly_match_rounds').select('audit').eq('id', input.roundId).single()
    if (readError || !round) throw new Error('ROUND_READ_FAILED')
    const frozen = roundSchema.parse(round.audit)
    const result = calculateSettlement(frozen, input)
    const { data, error } = await admin.rpc('record_weekly_match_settlement', {
      p_round_id: input.roundId,
      p_input_hash: semanticHash({ ...input, prices: [...input.prices].sort((a, b) => a.ticker.localeCompare(b.ticker)), result: { ...result, reason: input.voidReason ?? null } }),
      p_outcome: result.outcome,
      p_left_return: result.leftReturn,
      p_right_return: result.rightReturn,
      p_reason: result.reason,
      p_audit: input,
      p_correction_reason: input.correctionReason ?? null,
      p_automatic: input.automatic ?? false,
    })
    if (error) {
      if (error.message === 'CORRECTION_REASON_REQUIRED') return NextResponse.json({ success: false, error: '변경된 정산에는 정정 사유가 필요합니다' }, { status: 409, headers })
      if (error.message === 'ROUND_NOT_ENDED') return NextResponse.json({ success: false, error: '아직 라운드가 종료되지 않았습니다' }, { status: 409, headers })
      throw error
    }
    return NextResponse.json({ success: true, data: { roundId: data.round_id, version: data.version, outcome: data.outcome } }, { headers })
  } catch (error) {
    if (error instanceof Error && error.message === 'ROUND_NOT_ENDED') return NextResponse.json({ success: false, error: '아직 라운드가 종료되지 않았습니다' }, { status: 409, headers })
    if (error instanceof Error && ['INVALID_PRICE_EVIDENCE', 'UNSAFE_RETURN'].includes(error.message)) return NextResponse.json({ success: false, error: '정산 가격 근거가 올바르지 않습니다' }, { status: 400, headers })
    return NextResponse.json({ success: false, error: '주간 매치 운영 처리를 완료할 수 없습니다' }, { status: 503, headers })
  }
}
