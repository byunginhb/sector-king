/**
 * 인증 콜백 라우트 — OAuth(구글·카카오)와 이메일 매직링크가 함께 착지한다.
 *
 * 흐름:
 * 1. /login 에서 signInWithOAuth 또는 signInWithOtp 호출
 * 2. 제공자 인증 성공(또는 메일 링크 클릭) → Supabase Auth 가 ?code=... 로 본 라우트에 redirect
 * 3. exchangeCodeForSession 으로 httpOnly 세션 쿠키 SET
 * 4. ADMIN_EMAILS 매칭 시 admin role 자동 부여 (트리거가 처리하지만 fallback)
 * 5. ?redirect=... 가 안전한 same-origin path 면 그곳으로, 아니면 /
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeRedirectPath } from '@/lib/safe-redirect'

async function ensureAdminRoleForKnownEmails(email: string | null | undefined) {
  if (!email) return
  const adminEmailsRaw = process.env.ADMIN_EMAILS ?? ''
  const adminEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!adminEmails.includes(email.toLowerCase())) return

  try {
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', email)
      .neq('role', 'admin')
  } catch (err) {
    // service_role 미설정 환경 등에서는 조용히 패스 — DB 트리거가 fallback
    console.error('[auth/callback] admin role 부여 실패:', err)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectParam = searchParams.get('redirect') ?? searchParams.get('next')

  // 만료·재사용된 매직링크와 사용자가 취소한 OAuth 동의는 code 없이
  // ?error=... 로 되돌아온다. 그대로 두면 전부 "인증 코드 누락"으로 보여
  // 사용자가 무엇을 다시 해야 할지 알 수 없다.
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error')
  if (errorCode) {
    const reason = errorCode.includes('expired') ? 'link_expired' : 'oauth_failed'
    return NextResponse.redirect(`${origin}/login?error=${reason}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession 실패:', error.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // ADMIN_EMAILS 자동 부여 (trigger fallback)
  await ensureAdminRoleForKnownEmails(data.user?.email)

  // 문자열 이어붙이기가 지금은 우연히 안전하지만(파서가 `//evil.com` 을 같은
  // 출처의 경로로 읽는다), 그 안전성이 연결 방식에 걸려 있는 상태라 검증
  // 자체를 `lib/safe-redirect` 로 옮긴다.
  const safeNext = safeRedirectPath(redirectParam, origin)
  return NextResponse.redirect(new URL(safeNext, origin))
}
