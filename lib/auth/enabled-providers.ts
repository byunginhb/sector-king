/**
 * 로그인 화면에 그릴 제공자 목록 — Supabase 대시보드가 SoT.
 *
 * 기본 제공자(구글·카카오·이메일)는 `/auth/v1/settings` 가 anon 키로 열려 있어
 * 별도 환경변수 없이 실제 활성 상태를 그대로 읽는다. 대시보드에서 카카오를
 * 켜면 (캐시 5분 뒤) 버튼이 생기고 끄면 사라진다 — 코드에 목록을 박아두면
 * 배포와 대시보드 설정 사이에 "버튼은 있는데 눌러도 실패"하는 창이 반드시
 * 한 번 생긴다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  네이버만 경로를 하나 더 쓰는 이유
 * ────────────────────────────────────────────────────────────────────
 * 네이버는 Supabase 기본 제공자가 아니라 **Custom OAuth Provider**
 * (`custom:naver`) 로 등록한다. 그런데 커스텀 제공자는 공개 settings 에
 * 노출되지 않는다 — 실측했다(프로브 제공자를 만들어도 `external` 키가 26개
 * 그대로였다). 그래서 활성 여부는 service_role 로 admin 목록을 읽어야 알 수
 * 있다. 키가 없으면 네이버는 꺼진 것으로 본다(fail-closed): 없는 버튼은
 * 불편하지만, 눌리는데 실패하는 버튼은 이탈이다.
 *
 * 이메일(매직링크)도 settings 스위치를 그대로 쓴다. 커스텀 SMTP 없이 켜두면
 * Supabase 기본 메일러가 팀 계정에만·시간당 2통만 보내므로, SMTP 준비 전에는
 * 대시보드의 Email provider 를 꺼두는 것이 곧 UI 차단이 된다.
 */
import type { Provider } from '@supabase/supabase-js'

export type AuthProviderId = 'google' | 'kakao' | 'naver' | 'email'

/**
 * 로그인 후 계정에 **추가로 붙일 수 있는** 제공자. 이메일이 빠진 건 우리가
 * 비밀번호를 두지 않기 때문이다 — Supabase 의 `linkIdentity()` 는 OAuth 전용이고,
 * 이메일을 계정에 더하는 공식 경로는 `updateUser({ password })` 뿐이라
 * 패스워드리스 정책과 충돌한다.
 */
export const OAUTH_PROVIDER_IDS = ['google', 'kakao', 'naver'] as const
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number]

export type EnabledAuthProviders = Record<AuthProviderId, boolean>

/** 우리 식별자 → Supabase 가 아는 provider 문자열. */
const SUPABASE_PROVIDER: Record<OAuthProviderId, Provider> = {
  google: 'google',
  kakao: 'kakao',
  naver: 'custom:naver',
}

const CUSTOM_PREFIX = 'custom:'

export function toSupabaseProvider(id: OAuthProviderId): Provider {
  return SUPABASE_PROVIDER[id]
}

/**
 * Supabase 가 돌려준 provider 문자열 → 우리 식별자.
 * `auth.identities.provider` 는 커스텀 제공자를 `custom:naver` 로 담는다.
 */
export function fromSupabaseProvider(raw: string): string {
  return raw.startsWith(CUSTOM_PREFIX) ? raw.slice(CUSTOM_PREFIX.length) : raw
}

/**
 * 조회·파싱 실패 시 기준값 — 지금 실제로 동작이 확인된 경로만 남긴다.
 * 장애가 "로그인 화면에서 모든 선택지가 사라짐"이 되지 않게 하는 방어선.
 */
const FALLBACK: EnabledAuthProviders = {
  google: true,
  kakao: false,
  naver: false,
  email: false,
}

/** settings 가 실제로 알려주는 제공자들. 네이버는 여기 없다(위 주석 참조). */
const BUILTIN_IDS: AuthProviderId[] = ['google', 'kakao', 'email']

/** admin 목록 응답에서 활성 커스텀 제공자 식별자만. */
export function parseCustomProviders(payload: unknown): Set<string> {
  const providers = (payload as { providers?: unknown } | null | undefined)
    ?.providers
  if (!Array.isArray(providers)) return new Set()

  return new Set(
    providers
      .filter(
        (p): p is { identifier: string; enabled?: boolean } =>
          Boolean(p) &&
          typeof (p as { identifier?: unknown }).identifier === 'string' &&
          // enabled 를 안 내려주는 응답도 있어 "명시적 false 만 제외" 로 둔다.
          (p as { enabled?: unknown }).enabled !== false
      )
      .map((p) => fromSupabaseProvider(p.identifier))
  )
}

/**
 * settings 응답(+ 커스텀 제공자 목록) → 제공자 on/off.
 * settings 형태가 어긋나면 기본 제공자는 기준값으로 떨어진다.
 */
export function parseEnabledProviders(
  settings: unknown,
  customPayload?: unknown
): EnabledAuthProviders {
  const naver = parseCustomProviders(customPayload).has('naver')

  const external = (settings as { external?: unknown } | null | undefined)
    ?.external
  if (!external || typeof external !== 'object') return { ...FALLBACK, naver }

  const flags = external as Record<string, unknown>
  // 알려진 키 하나라도 boolean 이 아니면 응답 스키마가 바뀐 것으로 본다.
  // "파싱은 됐는데 전부 false" 와 "형태가 달라 전부 못 읽음" 은 결과가 같아서
  // 구분해두지 않으면 스키마 변경이 조용한 로그인 실종으로 나타난다.
  if (typeof flags.google !== 'boolean') return { ...FALLBACK, naver }

  const result: EnabledAuthProviders = { ...FALLBACK, naver }
  for (const id of BUILTIN_IDS) result[id] = flags[id] === true
  return result
}

/** Supabase 에 물어본 활성 제공자. 실패 시 기준값(구글만). */
export async function getEnabledAuthProviders(): Promise<EnabledAuthProviders> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return FALLBACK

  const [settings, custom] = await Promise.all([
    fetchJson(`${url}/auth/v1/settings`, { apikey: key }),
    fetchCustomProviders(url),
  ])
  return parseEnabledProviders(settings, custom)
}

async function fetchCustomProviders(url: string): Promise<unknown> {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE
  if (!serviceRole) return null
  return fetchJson(`${url}/auth/v1/admin/custom-providers`, {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
  })
}

async function fetchJson(
  url: string,
  headers: Record<string, string>
): Promise<unknown> {
  try {
    const res = await fetch(url, { headers, next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('[auth] 제공자 설정 조회 실패:', url, err)
    return null
  }
}
