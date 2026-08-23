import { describe, it, expect } from 'vitest'
import { parseEnabledProviders } from '@/lib/auth/enabled-providers'

describe('parseEnabledProviders', () => {
  it('실제 settings 응답에서 활성 제공자를 읽는다', () => {
    expect(
      parseEnabledProviders({
        external: { google: true, kakao: false, email: true, github: true },
      })
    ).toEqual({ google: true, kakao: false, email: true })
  })

  it('전부 꺼져 있으면 전부 false 로 존중한다', () => {
    expect(
      parseEnabledProviders({
        external: { google: false, kakao: false, email: false },
      })
    ).toEqual({ google: false, kakao: false, email: false })
  })

  // 스키마가 바뀌어 못 읽는 경우와 "운영자가 전부 껐다"는 결과가 같으면
  // 로그인 화면이 조용히 비어버린다 → 못 읽으면 구글만 남긴다.
  it('응답 형태가 어긋나면 기준값(구글만)으로 떨어진다', () => {
    const fallback = { google: true, kakao: false, email: false }
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
    ).toEqual({ google: true, kakao: false, email: false })
  })
})
