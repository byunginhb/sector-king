import { describe, it, expect } from 'vitest'
import { toOidcClaims } from '@/lib/auth/naver-profile'

const OK = {
  resultcode: '00',
  message: 'success',
  response: {
    id: 'gVkPNAJAWJICVxbnlRcVOhZG1P7UC18jwqvA7kJQ5eI',
    email: 'me@naver.com',
    name: '송병인',
    nickname: '병인',
    profile_image: 'https://ssl.pstatic.net/x.jpg',
  },
}

describe('toOidcClaims', () => {
  it('중첩된 response 를 표준 클레임으로 편다', () => {
    const { ok, claims } = toOidcClaims(OK)
    expect(ok).toBe(true)
    expect(claims).toEqual({
      sub: 'gVkPNAJAWJICVxbnlRcVOhZG1P7UC18jwqvA7kJQ5eI',
      email: 'me@naver.com',
      email_verified: true,
      name: '송병인',
      preferred_username: '병인',
      picture: 'https://ssl.pstatic.net/x.jpg',
    })
  })

  // sub 이 비면 Supabase 가 `missing provider id` 로 죽는다. 빈 값을 넘기느니
  // 여기서 끊고 502 를 돌려주는 편이 원인을 찾기 쉽다.
  it('id 가 없으면 실패로 끊는다', () => {
    const r = toOidcClaims({ ...OK, response: { email: 'me@naver.com' } })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('id')
  })

  it('resultcode 가 00 이 아니면 실패', () => {
    expect(toOidcClaims({ resultcode: '024', message: 'invalid token' }).ok).toBe(
      false
    )
  })

  it('빈 응답에도 터지지 않는다', () => {
    expect(toOidcClaims(null).ok).toBe(false)
    expect(toOidcClaims('nope').ok).toBe(false)
    expect(toOidcClaims({ resultcode: '00' }).ok).toBe(false)
  })

  // 이메일 제공에 동의하지 않은 사용자. 로그인은 되어야 하고, 없는 키는
  // 아예 빼서 빈 문자열이 저장되지 않게 한다(0017 이 null 을 견딘다).
  it('이메일이 없으면 email 키 자체를 뺀다', () => {
    const { ok, claims } = toOidcClaims({
      resultcode: '00',
      response: { id: 'abc', nickname: '병인' },
    })
    expect(ok).toBe(true)
    expect(claims).toEqual({
      sub: 'abc',
      name: '병인',
      preferred_username: '병인',
    })
    expect('email' in claims!).toBe(false)
    expect('email_verified' in claims!).toBe(false)
  })

  it('name 이 없으면 nickname 으로 대체한다', () => {
    const { claims } = toOidcClaims({
      resultcode: '00',
      response: { id: 'abc', nickname: '병인', email: 'me@naver.com' },
    })
    expect(claims!.name).toBe('병인')
  })
})
