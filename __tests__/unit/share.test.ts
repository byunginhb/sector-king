/**
 * 공유 URL·GA `share` 이벤트 분류 — 순수 함수.
 *
 * `getShareContent` 가 틀리면 GA 에서 "어떤 종목·리포트가 공유됐는지"가 전부
 * 'page' 로 뭉개진다. 화면에서는 티가 나지 않는 종류의 회귀라 여기서 고정한다.
 */
import { describe, it, expect } from 'vitest'
import { getShareContent, getShareUrl, getTwitterShareUrl } from '@/lib/share'

describe('getShareContent — 경로에서 공유 대상을 추론한다', () => {
  it('종목 상세는 티커가 item_id 다', () => {
    expect(getShareContent('/stock/NVDA')).toEqual({ contentType: 'stock', itemId: 'NVDA' })
  })

  it('점이 있는 한국 티커를 그대로 보존한다', () => {
    expect(getShareContent('/stock/005930.KS')).toEqual({
      contentType: 'stock',
      itemId: '005930.KS',
    })
  })

  it('섹터·리포트 상세를 구분한다', () => {
    expect(getShareContent('/sectors/semiconductor')).toEqual({
      contentType: 'sector',
      itemId: 'semiconductor',
    })
    expect(getShareContent('/news/0b9c1c2e-1111-4222-8333-444455556666')).toEqual({
      contentType: 'news_report',
      itemId: '0b9c1c2e-1111-4222-8333-444455556666',
    })
  })

  it('ID 가 없는 목록 화면은 상세로 분류하지 않는다', () => {
    expect(getShareContent('/news')).toEqual({ contentType: 'page', itemId: '/news' })
    expect(getShareContent('/sectors/')).toEqual({ contentType: 'page', itemId: '/sectors' })
  })

  it('그 외 화면은 경로 자체가 item_id 다', () => {
    expect(getShareContent('/rankings')).toEqual({ contentType: 'page', itemId: '/rankings' })
    expect(getShareContent('/tech/money-flow')).toEqual({
      contentType: 'page',
      itemId: '/tech/money-flow',
    })
    expect(getShareContent('/')).toEqual({ contentType: 'page', itemId: '/' })
  })

  it('쿼리스트링은 item_id 에 섞이지 않는다', () => {
    expect(getShareContent('/stock/TSLA?region=kr').itemId).toBe('TSLA')
  })

  it('인코딩된 세그먼트는 풀고, 깨진 인코딩은 원문을 유지한다', () => {
    expect(getShareContent('/stock/BRK%2EB').itemId).toBe('BRK.B')
    expect(getShareContent('/stock/%E0%A4%A').itemId).toBe('%E0%A4%A')
  })
})

describe('공유 URL 조립', () => {
  it('슬래시가 없는 경로도 절대 URL 로 만든다', () => {
    expect(getShareUrl('rankings')).toBe(getShareUrl('/rankings'))
    expect(getShareUrl('/rankings')).toMatch(/^https?:\/\/[^/]+\/rankings$/)
  })

  it('X 공유 URL 은 한글 텍스트와 URL 을 인코딩한다', () => {
    const parsed = new URL(getTwitterShareUrl('https://sector-king.com/stock/NVDA', '엔비디아 & 반도체'))
    expect(parsed.origin + parsed.pathname).toBe('https://twitter.com/intent/tweet')
    expect(parsed.searchParams.get('url')).toBe('https://sector-king.com/stock/NVDA')
    expect(parsed.searchParams.get('text')).toBe('엔비디아 & 반도체')
  })
})
