/**
 * 네이버 userinfo 프록시 — Supabase 커스텀 제공자의 `userinfo_url` 이 여기를 본다.
 *
 * Supabase 가 네이버 액세스 토큰을 Bearer 로 실어 호출하면, 우리가 네이버
 * 프로필 API 를 대신 부르고 응답의 한 겹(`response`)을 벗겨 OIDC 표준 클레임으로
 * 돌려준다. 이유는 `lib/auth/naver-profile.ts` 주석 참조.
 *
 * 보안: 시크릿을 쓰지 않는다. 호출자가 이미 가진 네이버 토큰을 그대로 넘기고
 * 그 토큰이 허용하는 자기 프로필만 돌아온다 — 권한이 늘어나지 않는다.
 * 토큰은 로그에 남기지 않는다.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { toOidcClaims } from '@/lib/auth/naver-profile'

const NAVER_PROFILE_URL = 'https://openapi.naver.com/v1/nid/me'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing bearer token' }, { status: 401 })
  }

  let payload: unknown
  try {
    const res = await fetch(NAVER_PROFILE_URL, {
      headers: { Authorization: authorization },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[auth/naver] 프로필 조회 실패:', res.status)
      return NextResponse.json({ error: 'naver profile failed' }, { status: 502 })
    }
    payload = await res.json()
  } catch (err) {
    console.error('[auth/naver] 프로필 조회 예외:', err)
    return NextResponse.json({ error: 'naver profile failed' }, { status: 502 })
  }

  const result = toOidcClaims(payload)
  if (!result.ok) {
    console.error('[auth/naver] 응답 해석 실패:', result.reason)
    return NextResponse.json({ error: 'naver profile invalid' }, { status: 502 })
  }

  // 개인정보라 CDN·브라우저 어디에도 남기지 않는다.
  return NextResponse.json(result.claims, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
