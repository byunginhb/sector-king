/**
 * Supabase Middleware 헬퍼 — 매 요청마다 세션 쿠키를 자동 갱신한다.
 *
 * 사용처: 프로젝트 루트의 `middleware.ts` 가 본 모듈의 `updateSession` 을
 * 호출한다. 모든 요청 (정적 자산 제외) 가 통과한다.
 *
 * 책임:
 * 1. `getUser()` 호출로 토큰 자동 refresh
 * 2. `/admin/**` 진입 시 비로그인 사용자를 `/login?redirect=...` 로 보냄
 *    (관리자 role 검증은 본 미들웨어 책임 X — `app/admin/layout.tsx` 가
 *    Server Component 단에서 재검증)
 *
 * Layer 1 (네트워크 경계). Layer 2(Server Component) + Layer 3(API) 와
 * 합쳐 3중 방어선을 구성한다.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_PATH_PREFIX = '/admin'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 토큰 자동 refresh (httpOnly 쿠키 갱신)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /admin/** 비로그인 차단
  const path = request.nextUrl.pathname
  if (path.startsWith(ADMIN_PATH_PREFIX) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', path + (request.nextUrl.search || ''))
    return NextResponse.redirect(loginUrl)
  }

  return response
}
