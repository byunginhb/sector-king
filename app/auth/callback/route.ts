/**
 * Google OAuth 콜백 라우트.
 *
 * 흐름:
 * 1. /login 에서 supabase.auth.signInWithOAuth 호출 → Google 로 redirect
 * 2. Google 인증 성공 → Supabase Auth Provider 가 ?code=... 로 본 라우트에 redirect
 * 3. exchangeCodeForSession 으로 httpOnly 세션 쿠키 SET
 * 4. ADMIN_EMAILS 매칭 시 admin role 자동 부여 (트리거가 처리하지만 fallback)
 * 5. ?redirect=... 가 안전한 same-origin path 면 그곳으로, 아니면 /
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isSafeRedirect(target: string | null): target is string {
  if (!target) return false
  if (!target.startsWith('/')) return false
  if (target.startsWith('//')) return false
  return true
}

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

  const safeNext = isSafeRedirect(redirectParam) ? redirectParam : '/'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
