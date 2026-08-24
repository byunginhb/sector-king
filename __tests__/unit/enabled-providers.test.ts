import { describe, it, expect } from 'vitest'
import {
  parseEnabledProviders,
  parseCustomProviders,
  toSupabaseProvider,
  fromSupabaseProvider,
} from '@/lib/auth/enabled-providers'

const OFF = { google: false, kakao: false, naver: false, email: false }

describe('parseEnabledProviders', () => {
  it('실제 settings 응답에서 활성 제공자를 읽는다', () => {
    expect(
      parseEnabledProviders({
        external: { google: true, kakao: false, email: true, github: true },
      })
    ).toEqual({ ...OFF, google: true, email: true })
  })

  it('전부 꺼져 있으면 전부 false 로 존중한다', () => {
    expect(
      parseEnabledProviders({
        external: { google: false, kakao: false, email: false },
      })
    ).toEqual(OFF)
  })

  // 스키마가 바뀌어 못 읽는 경우와 "운영자가 전부 껐다"는 결과가 같으면
  // 로그인 화면이 조용히 비어버린다 → 못 읽으면 구글만 남긴다.
  it('응답 형태가 어긋나면 기준값(구글만)으로 떨어진다', () => {
    const fallback = { ...OFF, google: true }
    expect(parseEnabledProviders(null)).toEqual(fallback)
    expect(parseEnabledProviders({})).toEqual(fallback)
    expect(parseEnabledProviders({ external: null })).toEqual(fallback)
    expect(parseEnabledProviders({ external: { google: 'true' } })).toEqual(
      fallback
    )
  })

  it('문자열 truthy 값을 켜진 것으로 착각하지 않는다', () => {
    expect(
      parseEnabledProviders({
        external: { google: true, kakao: 'true', email: 1 },
      })
    ).toEqual({ ...OFF, google: true })
  })

  // 네이버는 커스텀 제공자라 settings 에 아예 안 나온다(실측). 두 번째 경로가
  // 없으면 대시보드에서 켜도 버튼이 영원히 안 뜬다.
  it('네이버는 settings 가 아니라 커스텀 제공자 목록에서 켜진다', () => {
    const settings = { external: { google: true, kakao: false, email: false } }
    expect(parseEnabledProviders(settings).naver).toBe(false)
    expect(
      parseEnabledProviders(settings, {
        providers: [{ identifier: 'custom:naver', enabled: true }],
      }).naver
    ).toBe(true)
  })

  // settings 조회가 실패해도 커스텀 제공자 정보는 살아 있을 수 있다.
  it('settings 가 깨져도 네이버 판정은 유지된다', () => {
    expect(
      parseEnabledProviders(null, {
        providers: [{ identifier: 'custom:naver' }],
      })
    ).toEqual({ ...OFF, google: true, naver: true })
  })
})

describe('parseCustomProviders', () => {
  it('비활성 제공자는 제외한다', () => {
    const set = parseCustomProviders({
      providers: [
        { identifier: 'custom:naver', enabled: false },
        { identifier: 'custom:other' },
      ],
    })
    expect(set.has('naver')).toBe(false)
    expect(set.has('other')).toBe(true)
  })

  it('형태가 어긋나면 빈 집합', () => {
    expect(parseCustomProviders(null).size).toBe(0)
    expect(parseCustomProviders({ providers: 'nope' }).size).toBe(0)
  })
})

describe('provider 식별자 변환', () => {
  it('네이버만 custom: 접두어를 쓴다', () => {
    expect(toSupabaseProvider('google')).toBe('google')
    expect(toSupabaseProvider('kakao')).toBe('kakao')
    expect(toSupabaseProvider('naver')).toBe('custom:naver')
  })

  it('되돌릴 때 접두어를 벗긴다', () => {
    expect(fromSupabaseProvider('custom:naver')).toBe('naver')
    expect(fromSupabaseProvider('google')).toBe('google')
  })
})
