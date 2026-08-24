/**
 * 네이버 프로필 응답 → OIDC 표준 클레임.
 *
 * 왜 필요한가: Supabase 커스텀 OAuth 제공자는 userinfo 응답의 **최상위 키**만
 * 표준 클레임으로 읽는다(`attribute_mapping` 은 SAML 전용이고 중첩 경로를
 * 지원하지 않는다 — 실측으로 확인). 그런데 네이버는 한 겹 감싸서 준다:
 *
 *   { "resultcode": "00", "message": "success",
 *     "response": { "id": "...", "email": "...", "name": "...", ... } }
 *
 * 그래서 `sub` 조차 못 찾아 `missing provider id` 로 로그인이 실패했다.
 * OIDC 방식도 답이 아니었다 — 네이버 ID 토큰에는 iss/sub/aud/iat/exp 뿐이라
 * 이메일이 아예 실려오지 않는다(실측).
 *
 * 남는 방법은 응답을 평평하게 만들어 주는 것뿐이고, 그 일을 하는 게 이 함수와
 * `app/api/auth/naver/userinfo` 다.
 */

/** 네이버가 성공 응답에 싣는 resultcode. */
const NAVER_OK = '00'

export interface NaverUserinfoResult {
  ok: boolean
  /** ok=false 일 때 서버 로그에 남길 사유(사용자에게 노출하지 않는다). */
  reason?: string
  claims?: Record<string, unknown>
}

export function toOidcClaims(payload: unknown): NaverUserinfoResult {
  const body = payload as
    | { resultcode?: unknown; message?: unknown; response?: unknown }
    | null
    | undefined

  if (!body || typeof body !== 'object') {
    return { ok: false, reason: 'empty body' }
  }
  if (body.resultcode !== NAVER_OK) {
    return { ok: false, reason: `resultcode=${String(body.resultcode)}` }
  }

  const r = body.response as Record<string, unknown> | undefined
  if (!r || typeof r !== 'object') {
    return { ok: false, reason: 'missing response object' }
  }

  const id = str(r.id)
  // sub 이 없으면 Supabase 가 identity 를 만들 수 없다. 빈 값으로 넘기면
  // `missing provider id` 로 실패하므로 여기서 명확히 끊는다.
  if (!id) return { ok: false, reason: 'missing response.id' }

  const email = str(r.email)
  const nickname = str(r.nickname)

  // undefined 키는 JSON 직렬화에서 빠진다 — 빈 문자열을 보내 이메일이 ''
  // 로 저장되는 것보다 아예 없는 편이 낫다(0017 이후 null 을 견딘다).
  const claims: Record<string, unknown> = {
    sub: id,
    email,
    // 네이버 계정 이메일은 네이버가 소유·검증하는 주소다. 이 값이 있어야
    // Supabase 자동 링킹이 같은 이메일의 기존 계정을 찾아 붙인다.
    email_verified: email ? true : undefined,
    name: str(r.name) ?? nickname,
    preferred_username: nickname,
    picture: str(r.profile_image),
  }
  for (const k of Object.keys(claims)) {
    if (claims[k] === undefined) delete claims[k]
  }

  return { ok: true, claims }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
