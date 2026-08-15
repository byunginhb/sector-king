/**
 * GET /api/preview-tier — 미리보기 등급 쿠키 set / clear.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 403 이 아니라 "조용히 무시" 인가
 * ────────────────────────────────────────────────────────────────────
 *
 * 이 URL 은 링크로 공유될 수 있다(`?preview_tier=` 진입 링크를 관리자가 슬랙에
 * 붙여넣는 식). 관리자가 아닌 사람이 그 링크를 열었을 때 403 에러 화면을 주면,
 * 존재하지도 않는 문제를 사용자에게 떠넘기는 꼴이 된다. 쿠키만 세팅하지 않고
 * 목적지로 그대로 보내면 그 사람은 평소 화면을 볼 뿐 아무 일도 일어나지 않는다.
 * 실패를 조용히 흡수하는 것이 여기서는 정답이다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  이 라우트가 지키는 경계
 * ────────────────────────────────────────────────────────────────────
 *
 * - 관리자 검증은 **여기서 끝난다.** 쿠키가 붙었다는 사실만으로 어떤 쓰기 권한도
 *   생기지 않는다. 미리보기는 순수 표시 레이어이고, 쓰기 API·결제·관리자 API 는
 *   `sk_preview_tier` 를 읽지 않는다.
 * - 응답에 `private, no-store` 를 박는다. 리다이렉트가 공용 캐시에 남으면
 *   다른 사람의 요청이 관리자의 미리보기 상태를 물려받을 수 있다.
 * - `next` 는 같은 출처의 절대 경로만 허용한다. 검증 없이 그대로 넘기면
 *   오픈 리다이렉터가 된다.
 */

import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth/get-user'
import {
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE_SEC,
  PREVIEW_TIERS,
} from '@/lib/permissions/constants'
import { isTier, type Tier } from '@/lib/permissions/tier'

export const dynamic = 'force-dynamic'

/**
 * 오픈 리다이렉트 방지. `/` 로 시작하되 `//` 나 `/\` 는 프로토콜 상대 URL 이라
 * 외부 호스트로 나간다.
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

function isPreviewableTier(value: unknown): value is Tier {
  return isTier(value) && (PREVIEW_TIERS as readonly string[]).includes(value)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeNextPath(url.searchParams.get('next'))
  const response = NextResponse.redirect(new URL(next, url.origin))
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')

  const profile = await getCurrentProfile()
  // 관리자가 아니면 쿠키를 건드리지 않고 목적지로만 보낸다(조용한 무시).
  if (!profile || profile.role !== 'admin') return response

  if (url.searchParams.get('clear') === '1') {
    response.cookies.set({
      name: PREVIEW_COOKIE,
      value: '',
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    })
    return response
  }

  const tier = url.searchParams.get('tier')
  // 알 수 없는 등급도 조용히 무시 — 오타난 링크가 에러 화면이 되지 않게.
  if (!isPreviewableTier(tier)) return response

  response.cookies.set({
    name: PREVIEW_COOKIE,
    value: tier,
    path: '/',
    maxAge: PREVIEW_MAX_AGE_SEC,
    sameSite: 'lax',
    // httpOnly 를 켜지 않는다 — 배너가 클라이언트에서 같은 값을 읽어야 하고,
    // 이 쿠키는 보안 경계가 아니다(constants.ts PREVIEW_COOKIE 주석).
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
