/**
 * 리다이렉트 대상 경로 검증 — 오픈 리다이렉터 회귀 방지.
 *
 * 이 테스트가 지키는 것은 **문자열 검사만으로는 부족하다** 는 사실 하나다.
 * URL 파서가 탭·CR·LF 를 제거한 뒤 해석하기 때문에, `/`로 시작하고 `//`가
 * 아니라는 검사를 통과한 값이 파싱 단계에서 프로토콜 상대 URL 로 되살아난다.
 * 아래 ESCAPES 는 전부 그 경로로 외부 호스트에 도달했던 실제 입력이다.
 */
import { describe, it, expect } from 'vitest'
import { safeRedirectPath, isSafeRedirectPath } from '@/lib/safe-redirect'

const ORIGIN = 'https://sector-king.com'

/** 통과시키면 외부 호스트로 나가는 입력. 전부 '/' 로 떨어져야 한다. */
const ESCAPES = [
  '/\t/evil.com',
  '/\r/evil.com',
  '/\n/evil.com',
  '/\t\t//evil.com',
  '//evil.com',
  '/\\evil.com',
  '/\\\\evil.com',
  'https://evil.com',
  'http://evil.com',
  '//evil.com/path?a=1',
  'javascript:alert(1)',
  'evil.com',
]

describe('safeRedirectPath — 외부로 나가는 입력은 전부 차단한다', () => {
  for (const raw of ESCAPES) {
    it(`차단: ${JSON.stringify(raw)}`, () => {
      const result = safeRedirectPath(raw, ORIGIN)
      expect(result).toBe('/')
      // 이중 확인 — 결과를 실제로 파싱해도 같은 출처여야 한다.
      expect(new URL(result, ORIGIN).origin).toBe(ORIGIN)
    })
  }

  it('제어문자를 지운 뒤에도 같은 출처면 통과한다', () => {
    expect(safeRedirectPath('/rank\tings', ORIGIN)).toBe('/rankings')
  })
})

describe('safeRedirectPath — 정상 내부 경로는 보존한다', () => {
  it.each([
    ['/', '/'],
    ['/rankings', '/rankings'],
    ['/stock/TSLA', '/stock/TSLA'],
    ['/sectors/autonomous?region=kr', '/sectors/autonomous?region=kr'],
    ['/guide#section', '/guide#section'],
    ['/admin/permissions', '/admin/permissions'],
  ])('%s → %s', (raw, expected) => {
    expect(safeRedirectPath(raw, ORIGIN)).toBe(expected)
  })

  it('빈 값은 기본 경로로 떨어진다', () => {
    expect(safeRedirectPath(null, ORIGIN)).toBe('/')
    expect(safeRedirectPath(undefined, ORIGIN)).toBe('/')
    expect(safeRedirectPath('', ORIGIN)).toBe('/')
  })

  it('fallback 을 지정할 수 있다', () => {
    expect(safeRedirectPath('//evil.com', ORIGIN, '/login')).toBe('/login')
  })

  it('origin 없이도 형태 검사는 동작한다', () => {
    expect(safeRedirectPath('/rankings')).toBe('/rankings')
    expect(safeRedirectPath('/\t/evil.com')).toBe('/')
  })
})

describe('isSafeRedirectPath', () => {
  it('안전한 경로만 true', () => {
    expect(isSafeRedirectPath('/rankings')).toBe(true)
    expect(isSafeRedirectPath('/\t/evil.com')).toBe(false)
    expect(isSafeRedirectPath('//evil.com')).toBe(false)
    expect(isSafeRedirectPath(null)).toBe(false)
  })
})
