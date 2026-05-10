/**
 * PATCH /api/admin/contact/[id]
 *
 * 관리자 — contact_submissions 의 status / admin_note 업데이트.
 * Body: { status?, adminNote?, sendReplyEmail?: boolean }
 *
 * sendReplyEmail=true 이면 admin_note 를 본문으로 사용자 이메일에 답변 메일 발송.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, isResendConfigured } from '@/lib/email/resend'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_VALUES = ['open', 'replied', 'closed'] as const

const patchSchema = z
  .object({
    status: z.enum(STATUS_VALUES).optional(),
    adminNote: z.string().max(5000).optional(),
    sendReplyEmail: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.adminNote !== undefined ||
      v.sendReplyEmail !== undefined,
    { message: '변경할 필드가 없습니다' }
  )

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const body: ApiResponse<never> = { success: false, error: '잘못된 id' }
    return NextResponse.json(body, { status: 400 })
  }

  let parsed: z.infer<typeof patchSchema>
  try {
    const json = await req.json()
    const result = patchSchema.safeParse(json)
    if (!result.success) {
      const body: ApiResponse<never> = {
        success: false,
        error: result.error.issues[0]?.message ?? '입력값 오류',
      }
      return NextResponse.json(body, { status: 400 })
    }
    parsed = result.data
  } catch {
    const body: ApiResponse<never> = { success: false, error: 'JSON 파싱 실패' }
    return NextResponse.json(body, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. 기존 행 조회 (메일 발송용 email/subject 필요)
  const { data: existing, error: fetchErr } = await admin
    .from('contact_submissions')
    .select('id, email, subject, status, admin_note')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr || !existing) {
    const body: ApiResponse<never> = {
      success: false,
      error: '문의를 찾을 수 없습니다',
    }
    return NextResponse.json(body, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (parsed.status !== undefined) updatePayload.status = parsed.status
  if (parsed.adminNote !== undefined) updatePayload.admin_note = parsed.adminNote

  let emailResult: { status: string; error?: string } | null = null

  if (parsed.sendReplyEmail) {
    const noteForEmail = parsed.adminNote ?? existing.admin_note
    if (!noteForEmail) {
      const body: ApiResponse<never> = {
        success: false,
        error: '답변 메모가 비어 있어 메일을 보낼 수 없습니다',
      }
      return NextResponse.json(body, { status: 400 })
    }
    if (!isResendConfigured()) {
      emailResult = { status: 'skipped', error: 'RESEND_API_KEY 미설정' }
    } else {
      const subject = `Re: ${existing.subject}`
      const html = renderReplyHtml(noteForEmail)
      const result = await sendEmail({
        to: existing.email,
        subject,
        html,
        text: noteForEmail,
      })
      emailResult = result
      // 발송 성공 시 status = replied
      if (result.status === 'sent' && updatePayload.status === undefined) {
        updatePayload.status = 'replied'
      }
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    const body: ApiResponse<{ emailResult: typeof emailResult }> = {
      success: true,
      data: { emailResult },
    }
    return NextResponse.json(body)
  }

  const { error: updErr } = await admin
    .from('contact_submissions')
    .update(updatePayload)
    .eq('id', id)
  if (updErr) {
    console.error('[admin.contact.PATCH]', updErr)
    const body: ApiResponse<never> = {
      success: false,
      error: '업데이트 실패',
    }
    return NextResponse.json(body, { status: 500 })
  }

  const body: ApiResponse<{ emailResult: typeof emailResult }> = {
    success: true,
    data: { emailResult },
  }
  return NextResponse.json(body)
}

function renderReplyHtml(noteBody: string): string {
  const escaped = noteBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
  return `<!doctype html>
<html lang="ko">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
    <div style="max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">Sector King</p>
      <h1 style="font-size: 18px; margin: 0 0 16px 0;">문의에 대한 답변</h1>
      <div style="font-size: 14px; line-height: 1.6; color: #0f172a; white-space: normal;">${escaped}</div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        본 메일은 sector-king 의 문의 답변입니다.
      </p>
    </div>
  </body>
</html>`
}
