/**
 * 로그인 화면에 그릴 제공자 목록 — Supabase 대시보드가 SoT.
 *
 * `/auth/v1/settings` 는 anon 키로 열려 있는 공개 엔드포인트라, 별도 환경변수
 * 없이 제공자의 실제 활성 상태를 그대로 읽는다. 대시보드에서 카카오를 켜면
 * (캐시 5분 뒤) 버튼이 생기고 끄면 사라진다 — 코드에 목록을 박아두면
 * "버튼은 있는데 눌러도 실패"하는 창이 배포와 대시보드 설정 사이에 반드시
 * 한 번 생긴다.
 *
 * 이메일(매직링크)도 같은 스위치를 쓴다. 커스텀 SMTP 없이 켜두면 Supabase
 * 기본 메일러가 팀 계정에만·시간당 2통만 보내므로, SMTP 준비 전에는
 * 대시보드의 Email provider 를 꺼두는 것이 곧 UI 차단이 된다.
 */
export type AuthProviderId = 'google' | 'kakao' | 'email'

export type EnabledAuthProviders = Record<AuthProviderId, boolean>

/**
 * settings 조회·파싱 실패 시 기준값 — 지금 실제로 동작이 확인된 경로만 남긴다.
 * 장애가 "로그인 화면에서 모든 선택지가 사라짐"이 되지 않게 하는 방어선.
 */
const FALLBACK: EnabledAuthProviders = {
  google: true,
  kakao: false,
  email: false,
}

const PROVIDER_IDS: AuthProviderId[] = ['google', 'kakao', 'email']

/** settings 응답 → 제공자 on/off. 응답 형태가 어긋나면 기준값. */
export function parseEnabledProviders(settings: unknown): EnabledAuthProviders {
  const external = (settings as { external?: unknown } | null | undefined)
    ?.external
  if (!external || typeof external !== 'object') return FALLBACK

  const flags = external as Record<string, unknown>
  // 알려진 키 하나라도 boolean 이 아니면 응답 스키마가 바뀐 것으로 본다.
  // "파싱은 됐는데 전부 false" 와 "형태가 달라 전부 못 읽음" 은 결과가 같아서
  // 구분해두지 않으면 스키마 변경이 조용한 로그인 실종으로 나타난다.
  if (typeof flags.google !== 'boolean') return FALLBACK

  return PROVIDER_IDS.reduce((acc, id) => {
    acc[id] = flags[id] === true
    return acc
  }, {} as EnabledAuthProviders)
}

/** Supabase 에 물어본 활성 제공자. 실패 시 기준값(구글만). */
export async function getEnabledAuthProviders(): Promise<EnabledAuthProviders> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return FALLBACK

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
    })
    if (!res.ok) return FALLBACK
    return parseEnabledProviders(await res.json())
  } catch (err) {
    console.error('[auth] 제공자 설정 조회 실패:', err)
    return FALLBACK
  }
}
