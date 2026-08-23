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

  const supabase = await createClient()

  if (errorCode) {
    return NextResponse.redirect(
      await errorRedirect(supabase, origin, redirectParam, reasonFor(errorCode))
    )
  }

  if (!code) {
    return NextResponse.redirect(
      await errorRedirect(supabase, origin, redirectParam, 'missing_code')
    )
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession 실패:', error.message)
    return NextResponse.redirect(
      await errorRedirect(supabase, origin, redirectParam, 'oauth_failed')
    )
  }

  // ADMIN_EMAILS 자동 부여 (trigger fallback)
  await ensureAdminRoleForKnownEmails(data.user?.email)

  // 문자열 이어붙이기가 지금은 우연히 안전하지만(파서가 `//evil.com` 을 같은
  // 출처의 경로로 읽는다), 그 안전성이 연결 방식에 걸려 있는 상태라 검증
  // 자체를 `lib/safe-redirect` 로 옮긴다.
  const safeNext = safeRedirectPath(redirectParam, origin)
  return NextResponse.redirect(new URL(safeNext, origin))
}

function reasonFor(errorCode: string): string {
  if (errorCode.includes('expired')) return 'link_expired'
  if (errorCode.includes('identity_already_exists')) return 'identity_taken'
  return 'oauth_failed'
}

/**
 * 오류를 **흐름이 시작된 화면**으로 되돌린다.
 *
 * 이 라우트는 로그인과 계정 연결(`linkIdentity`)이 함께 착지한다. 연결 실패를
 * `/login` 으로 보내면 오류가 조용히 사라진다 — 그 화면은 이미 로그인된
 * 사용자를 곧장 redirect 대상으로 돌려보내기 때문이다. 세션 유무가 두 흐름을
 * 정확히 가른다(연결은 로그인 상태에서만 시작된다).
 */
async function errorRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  origin: string,
  redirectParam: string | null,
  reason: string
): Promise<URL> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const target = new URL(
    user ? safeRedirectPath(redirectParam, origin) : '/login',
    origin
  )
  target.searchParams.set('error', reason)
  return target
}
