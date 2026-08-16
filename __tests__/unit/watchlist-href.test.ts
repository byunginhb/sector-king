import { describe, it, expect } from 'vitest'
import { watchlistHref } from '@/lib/me/dto'

const LINKABLE = new Set(['semiconductor', 'autonomous'])

describe('watchlistHref — 워치리스트 항목의 상세 경로', () => {
  it('종목은 /stock/{ticker} 로 간다', () => {
    expect(watchlistHref('ticker', 'NVDA', LINKABLE)).toBe('/stock/NVDA')
  })

  it('점이 있는 한국 티커도 그대로 인코딩되어 동작한다', () => {
    // `.KS` 는 인코딩 대상 문자가 없지만, 규약상 항상 encodeURIComponent 를 거친다.
    expect(watchlistHref('ticker', '005930.KS', LINKABLE)).toBe('/stock/005930.KS')
  })

  it('산업은 루트 세그먼트다', () => {
    expect(watchlistHref('industry', 'tech', LINKABLE)).toBe('/tech')
  })

  it('상세 페이지가 있는 섹터만 링크된다', () => {
    expect(watchlistHref('sector', 'semiconductor', LINKABLE)).toBe(
      '/sectors/semiconductor'
    )
  })

  it('종목 3개 미만이라 페이지가 없는 섹터는 null 이다 (404 방지)', () => {
    expect(watchlistHref('sector', 'tiny_sector', LINKABLE)).toBe(null)
  })

  it('링크 가능 목록을 모르면 섹터는 링크하지 않는다 (fail-closed)', () => {
    // 조회 실패 시 링크를 거는 쪽이 404 를 만든다 — 모르면 안 건다.
    expect(watchlistHref('sector', 'semiconductor')).toBe(null)
    // 종목·산업은 목록과 무관하게 항상 유효한 경로다.
    expect(watchlistHref('ticker', 'AAPL')).toBe('/stock/AAPL')
    expect(watchlistHref('industry', 'finance')).toBe('/finance')
  })

  it('빈 키는 링크하지 않는다', () => {
    expect(watchlistHref('ticker', '', LINKABLE)).toBe(null)
    expect(watchlistHref('industry', '', LINKABLE)).toBe(null)
  })

  it('경로 조작 문자가 세그먼트를 탈출하지 않는다', () => {
    expect(watchlistHref('ticker', '../admin', LINKABLE)).toBe('/stock/..%2Fadmin')
    expect(watchlistHref('industry', 'a/b', LINKABLE)).toBe('/a%2Fb')
  })
})
