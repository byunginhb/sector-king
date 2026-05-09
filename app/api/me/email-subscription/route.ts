/**
 * GET   /api/me/email-subscription — 본인 구독 상태 (없으면 기본값 daily=false / hour=8)
 * PATCH /api/me/email-subscription — daily_report / hour_kst 부분 갱신 (upsert)
 *
 * RESEND_API_KEY 미설정 환경에서도 row 는 갱신된다 (UI 가 비활성 처리만).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import {
  EMAIL_SUB_COLUMNS,
  isEmailFeatureEnabled,
  rowToEmailSubscriptionDto,
} from '@/lib/me/dto'
import { emailSubscriptionPatchSchema } from '@/lib/me/schema'
import type { ApiResponse } from '@/types'
import type { EmailSubscriptionDTO } from '@/drizzle/supabase-schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('email_subscriptions')
      .select(EMAIL_SUB_COLUMNS)
      .eq('user_id', guard.profile.id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/me/email-subscription] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '구독 정보를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const emailEnabled = isEmailFeatureEnabled()
    const dto: EmailSubscriptionDTO = data
      ? rowToEmailSubscriptionDto(
          data as Parameters<typeof rowToEmailSubscriptionDto>[0],
          emailEnabled
        )
      : {
          userId: guard.profile.id,
          dailyReport: false,
          hourKst: 8,
          lastSentAt: null,
          emailEnabled,
        }

    const body: ApiResponse<{ subscription: EmailSubscriptionDTO }> = {
      success: true,
      data: { subscription: dto },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/me/email-subscription]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response

  try {
    const json = await req.json().catch(() => null)
    const parsed = emailSubscriptionPatchSchema.safeParse(json)
    if (!parsed.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const userId = guard.profile.id

    const payload: Record<string, unknown> = { user_id: userId }
    if (typeof parsed.data.dailyReport === 'boolean') {
      payload.daily_report = parsed.data.dailyReport
    }
    if (typeof parsed.data.hourKst === 'number') {
      payload.hour_kst = parsed.data.hourKst
    }

    const { data, error } = await supabase
      .from('email_subscriptions')
      .upsert(payload, { onConflict: 'user_id' })
      .select(EMAIL_SUB_COLUMNS)
      .single()

    if (error) {
      console.error('[PATCH /api/me/email-subscription] supabase', error.message)
      const body: ApiResponse<never> = {
        success: false,
        error: '구독 정보 저장 실패',
      }
      return NextResponse.json(body, { status: 500 })
    }

    const dto = rowToEmailSubscriptionDto(
      data as Parameters<typeof rowToEmailSubscriptionDto>[0],
      isEmailFeatureEnabled()
    )
    const body: ApiResponse<{ subscription: EmailSubscriptionDTO }> = {
      success: true,
      data: { subscription: dto },
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[PATCH /api/me/email-subscription]', err)
    const body: ApiResponse<never> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
