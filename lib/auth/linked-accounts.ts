/**
 * "로그인 수단" 화면의 view model — 순수 함수.
 *
 * 계정 분리는 우리 도메인의 실제 문제다. Supabase 자동 링킹은 **이메일이
 * 같을 때만** 작동하는데, 한국 사용자는 구글 @gmail.com / 카카오 @kakao.com /
 * 네이버 @naver.com 처럼 제공자마다 주소가 다른 경우가 오히려 흔하다. 그래서
 * 로그인 후 직접 연결하는 경로(`linkIdentity`)가 필요하고, 이 파일은 그 화면이
 * 무엇을 보여줄지만 계산한다(네트워크·React 없음).
 */
import {
  OAUTH_PROVIDER_IDS,
  type AuthProviderId,
  type EnabledAuthProviders,
  type OAuthProviderId,
} from './enabled-providers'

/** `supabase.auth.getUser()` 의 `user.identities` 중 화면에 쓰는 부분만. */
export interface RawIdentity {
  identity_id?: string | null
  provider: string
  identity_data?: { email?: string | null } | null
}

export interface LinkedAccount {
  identityId: string
  provider: string
  /** 제공자가 준 이메일. 카카오 미동의·네이버처럼 없을 수 있다. */
  email: string | null
  canUnlink: boolean
}

export interface LinkedAccountsView {
  linked: LinkedAccount[]
  linkable: OAuthProviderId[]
}

/** 표시 순서 — 목록이 로그인 화면과 같은 순서로 읽히게 고정한다. */
const DISPLAY_ORDER: AuthProviderId[] = [...OAUTH_PROVIDER_IDS, 'email']

function orderOf(provider: string): number {
  const i = DISPLAY_ORDER.indexOf(provider as AuthProviderId)
  return i === -1 ? DISPLAY_ORDER.length : i
}

export function buildLinkedAccountsView(
  identities: RawIdentity[] | null | undefined,
  enabled: EnabledAuthProviders
): LinkedAccountsView {
  const list = (identities ?? []).filter((i) => i && typeof i.provider === 'string')

  const linked: LinkedAccount[] = list
    .map((i) => ({
      identityId: i.identity_id ?? '',
      provider: i.provider,
      email: i.identity_data?.email ?? null,
      canUnlink:
        // 마지막 수단을 떼면 계정에 다시 들어올 방법이 없다. Supabase 도
        // 서버에서 거부하지만, 누른 뒤 실패를 보는 것과 애초에 못 누르는 것은
        // 다르다.
        list.length >= 2 &&
        // 이메일은 되돌릴 수 없어서 뺀다 — 우리 UI 에 이메일을 *다시 붙이는*
        // 경로가 없다(OAUTH_PROVIDER_IDS 주석 참조). 한 번 떼면 끝이다.
        i.provider !== 'email',
    }))
    .sort((a, b) => orderOf(a.provider) - orderOf(b.provider))

  const linkedProviders = new Set(linked.map((a) => a.provider))
  const linkable = OAUTH_PROVIDER_IDS.filter(
    // 꺼진 제공자는 연결 버튼을 만들어도 누르면 실패한다.
    // 이미 붙은 제공자는 Supabase 가 중복 연결을 거부한다.
    (p) => enabled[p] && !linkedProviders.has(p)
  )

  return { linked, linkable: [...linkable] }
}
