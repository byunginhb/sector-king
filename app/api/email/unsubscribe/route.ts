/**
 * GET/POST /api/email/unsubscribe?token=<uuid>
 *
 * 1-click unsubscribe 엔드포인트.
 * - GET: 토큰 검증 → daily_report=false set → /email/unsubscribed 로 redirect
 * - POST: RFC 8058 List-Unsubscribe-Post 지원 (Gmail / Outlook 1-click 버튼)
 *   둘 다 인증 불필요 — 토큰이 인증 역할.
 *
 * 보안:
 * - 토큰 미스매치 시에도 200 OK + "이미 해지되었거나 잘못된 링크" (정보 노출 차단)
 * - service_role 키로 RLS 우회해 update.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function processUnsubscribe(token: string | null): Promise<{
  ok: boolean
  reason?: string
}> {
  if (!token || !UUID_RE.test(token)) {
    return { ok: false, reason: 'invalid_token_format' }
  }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('email_subscriptions')
      .update({ daily_report: false })
      .eq('unsubscribe_token', token)
      .select('user_id')
      .maybeSingle()
    if (error) {
      console.error('[email.unsubscribe] update', error)
      return { ok: false, reason: 'db_error' }
    }
    if (!data) {
      return { ok: false, reason: 'no_match' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email.unsubscribe] unexpected', err)
    return { ok: false, reason: 'unexpected' }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  await processUnsubscribe(token)

  // 정보 노출 차단 — 결과와 무관하게 동일 페이지로 리다이렉트
  const target = new URL('/email/unsubscribed', url.origin)
  return NextResponse.redirect(target, { status: 303 })
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  let token = url.searchParams.get('token')

  // RFC 8058: One-Click 은 보통 폼 데이터로 전송
  if (!token) {
    const contentType = req.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await req.text()
        const params = new URLSearchParams(body)
        token = params.get('token')
      } else if (contentType.includes('application/json')) {
        const body = (await req.json().catch(() => ({}))) as {
          token?: string
        }
        token = body.token ?? null
      }
    } catch {
      // ignore
    }
  }

  await processUnsubscribe(token)

  // RFC 8058 — 1-click 은 200 OK 단순 응답
  return NextResponse.json({ success: true })
}
