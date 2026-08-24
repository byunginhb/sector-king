import { describe, it, expect } from 'vitest'
import { buildLinkedAccountsView } from '@/lib/auth/linked-accounts'
import type { EnabledAuthProviders } from '@/lib/auth/enabled-providers'

const ALL_ON: EnabledAuthProviders = {
  google: true,
  kakao: true,
  naver: true,
  email: true,
}

function identity(provider: string, email: string | null = null) {
  return {
    identity_id: `id-${provider}`,
    provider,
    identity_data: { email },
  }
}

describe('buildLinkedAccountsView', () => {
  it('연결 안 된 활성 제공자만 연결 후보로 남긴다', () => {
    const view = buildLinkedAccountsView(
      [identity('google', 'a@gmail.com')],
      ALL_ON
    )
    expect(view.linkable).toEqual(['kakao', 'naver'])
    expect(view.linked.map((a) => a.provider)).toEqual(['google'])
  })

  it('꺼진 제공자는 연결 버튼을 만들지 않는다', () => {
    const view = buildLinkedAccountsView([identity('google')], {
      google: true,
      kakao: false,
      naver: false,
      email: true,
    })
    expect(view.linkable).toEqual([])
  })

  // 마지막 수단을 떼면 계정에 다시 들어올 방법이 없다.
  it('로그인 수단이 하나뿐이면 해제할 수 없다', () => {
    const view = buildLinkedAccountsView([identity('google')], ALL_ON)
    expect(view.linked[0].canUnlink).toBe(false)
  })

  it('두 개 이상이면 해제할 수 있다', () => {
    const view = buildLinkedAccountsView(
      [identity('google'), identity('kakao')],
      ALL_ON
    )
    expect(view.linked.every((a) => a.canUnlink)).toBe(true)
  })

  // 이메일을 다시 붙이는 경로가 UI 에 없다 → 한 번 떼면 되돌릴 수 없다.
  it('이메일은 다른 수단이 있어도 해제 대상이 아니다', () => {
    const view = buildLinkedAccountsView(
      [identity('google'), identity('email', 'a@gmail.com')],
      ALL_ON
    )
    const email = view.linked.find((a) => a.provider === 'email')!
    expect(email.canUnlink).toBe(false)
    expect(view.linked.find((a) => a.provider === 'google')!.canUnlink).toBe(true)
  })

  it('이메일을 안 준 제공자도 목록에 남는다', () => {
    const view = buildLinkedAccountsView([identity('kakao', null)], ALL_ON)
    expect(view.linked[0].email).toBeNull()
  })

  it('표시 순서는 구글 → 카카오 → 이메일 로 고정된다', () => {
    const view = buildLinkedAccountsView(
      [identity('email'), identity('kakao'), identity('google')],
      ALL_ON
    )
    expect(view.linked.map((a) => a.provider)).toEqual([
      'google',
      'kakao',
      'email',
    ])
  })

  it('identities 가 없어도 터지지 않는다', () => {
    expect(buildLinkedAccountsView(undefined, ALL_ON).linked).toEqual([])
    expect(buildLinkedAccountsView(null, ALL_ON).linkable).toEqual([
      'google',
      'kakao',
      'naver',
    ])
  })

  // Supabase 는 커스텀 제공자를 `custom:naver` 로 돌려준다. 벗기지 않으면
  // 라벨이 깨지고 "이미 연결됨" 판정이 실패해 연결 버튼이 계속 남는다.
  it('custom: 접두어를 벗겨 네이버로 인식한다', () => {
    const view = buildLinkedAccountsView(
      [identity('google'), identity('custom:naver', 'me@naver.com')],
      ALL_ON
    )
    expect(view.linked.map((a) => a.provider)).toEqual(['google', 'naver'])
    expect(view.linkable).toEqual(['kakao'])
  })

  it('네이버가 꺼져 있으면 연결 후보에 없다', () => {
    const view = buildLinkedAccountsView([identity('google')], {
      google: true,
      kakao: true,
      naver: false,
      email: true,
    })
    expect(view.linkable).toEqual(['kakao'])
  })
})
