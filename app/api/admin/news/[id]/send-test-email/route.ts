/**
 * POST /api/admin/news/[id]/send-test-email
 *
 * - admin 가드
 * - body: { recipient?: string }  미지정 시 admin 본인 이메일
 * - news_reports 단일 조회 → React Email render → Resend send
 * - email_log INSERT (kind='test_daily_news')
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { NEWS_FULL_COLUMNS, rowToDto } from '@/lib/news/dto'
import { renderDailyNewsEmail } from '@/lib/email/render-daily-news'
import { isResendConfigured, sendEmail } from '@/lib/email/resend'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const inputSchema = z
  .object({
    recipient: z.string().email().optional(),
  })
  .strict()

interface SendTestResponse {
  sentTo: string
  status: 'sent' | 'skipped' | 'failed'
  emailId?: string | null
  error?: string
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    const body: ApiResponse<SendTestResponse> = {
      success: false,
      error: '잘못된 요청입니다',
    }
    return NextResponse.json(body, { status: 400 })
  }

  if (!isResendConfigured()) {
    const body: ApiResponse<SendTestResponse> = {
      success: false,
      error:
        '이메일 발송 인프라(RESEND_API_KEY)가 설정되지 않았습니다. 환경변수 등록 후 다시 시도해주세요.',
    }
    return NextResponse.json(body, { status: 503 })
  }

  try {
    const json = await req.json().catch(() => ({}))
    const parsed = inputSchema.safeParse(json ?? {})
    if (!parsed.success) {
      const body: ApiResponse<SendTestResponse> = {
        success: false,
        error: parsed.error.issues[0]?.message ?? '잘못된 입력',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const recipient = parsed.data.recipient ?? guard.profile.email
    if (!recipient) {
      const body: ApiResponse<SendTestResponse> = {
        success: false,
        error: '수신자 이메일을 확인할 수 없습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('news_reports')
      .select(NEWS_FULL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[send-test-email] supabase', error.message)
      const body: ApiResponse<SendTestResponse> = {
        success: false,
        error: '리포트를 불러올 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }
    if (!data) {
      const body: ApiResponse<SendTestResponse> = {
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }
      return NextResponse.json(body, { status: 404 })
    }

    const report = rowToDto(data as Parameters<typeof rowToDto>[0])
    const rendered = await renderDailyNewsEmail({
      report,
      recipientName: guard.profile.name ?? undefined,
    })

    const result = await sendEmail({
      to: recipient,
      subject: `[테스트] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    })

    // email_log INSERT — RLS 가 service_role write 만 허용한다면 실패해도 무시
    try {
      await supabase.from('email_log').insert({
        user_id: guard.profile.id,
        kind: 'test_daily_news',
        subject: `[테스트] ${rendered.subject}`,
        status: result.status,
        error: result.status === 'failed' ? result.error : null,
      })
    } catch (logErr) {
      console.error('[send-test-email] email_log insert', logErr)
    }

    if (result.status === 'failed') {
      const body: ApiResponse<SendTestResponse> = {
        success: false,
        error: result.error,
      }
      return NextResponse.json(body, { status: 502 })
    }

    const responseData: SendTestResponse =
      result.status === 'sent'
        ? { sentTo: recipient, status: 'sent', emailId: result.messageId }
        : { sentTo: recipient, status: 'skipped', error: result.reason }

    const body: ApiResponse<SendTestResponse> = {
      success: true,
      data: responseData,
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[send-test-email] unexpected', err)
    const body: ApiResponse<SendTestResponse> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
