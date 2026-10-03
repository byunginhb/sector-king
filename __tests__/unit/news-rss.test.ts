/**
 * 마켓 리포트 RSS 조립 — 리더가 피드를 통째로 버리게 만드는 입력을 막는다.
 *
 * 제목·요약은 관리자가 쓰는 자유 텍스트라 `&`·`<` 가 실제로 들어온다(AT&T, S&P 500).
 * 이스케이프가 하나라도 빠지면 XML 파싱이 실패해 항목 하나가 아니라 피드 전체가 죽는다.
 */
import { describe, it, expect } from 'vitest'
import { buildRssFeed, escapeXml, toRssDate, type RssReport } from '@/lib/news/rss'

const CHANNEL = {
  baseUrl: 'https://sector-king.com',
  title: 'Sector King 마켓 리포트',
  description: '일별·월별 마켓 리포트',
  feedPath: '/news/rss.xml',
}

const ID = '3f2b8c1e-1111-4222-8333-444455556666'

function report(overrides: Partial<RssReport> = {}): RssReport {
  return {
    id: ID,
    title: '반도체 강세',
    publishedAt: '2026-10-02T22:30:00.000Z',
    reportDate: '2026-10-02',
    summary: '외국인 매수 유입',
    keywords: ['반도체'],
    ...overrides,
  }
}

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc
}

describe('escapeXml', () => {
  it('XML 특수문자 5종을 엔티티로 바꾼다', () => {
    expect(escapeXml(`S&P <500> "급등" it's`)).toBe(
      'S&amp;P &lt;500&gt; &quot;급등&quot; it&apos;s'
    )
  })

  it('이미 이스케이프된 것처럼 보이는 입력도 다시 이스케이프한다(원문 보존)', () => {
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })

  it('XML 1.0 이 허용하지 않는 제어 문자를 제거하고 개행·탭은 남긴다', () => {
    expect(escapeXml('a\u0000b\u0008c\u001Fd')).toBe('abcd')
    expect(escapeXml('a\tb\nc')).toBe('a\tb\nc')
  })

  it('한글은 그대로 둔다', () => {
    expect(escapeXml('반도체 자금 흐름')).toBe('반도체 자금 흐름')
  })
})

describe('toRssDate', () => {
  it('ISO 타임스탬프를 RFC 822 로 바꾼다', () => {
    expect(toRssDate('2026-10-02T22:30:00.000Z')).toBe('Fri, 02 Oct 2026 22:30:00 GMT')
  })

  it('날짜만 있으면 KST 자정으로 해석한다', () => {
    expect(toRssDate('2026-10-02')).toBe('Thu, 01 Oct 2026 15:00:00 GMT')
  })

  it('해석할 수 없으면 null', () => {
    expect(toRssDate('어제')).toBeNull()
    expect(toRssDate(null)).toBeNull()
    expect(toRssDate('')).toBeNull()
  })
})

describe('buildRssFeed', () => {
  it('리포트가 없어도 유효한 빈 피드를 만든다', () => {
    const doc = parse(buildRssFeed(CHANNEL, []))
    expect(doc.querySelector('rss')?.getAttribute('version')).toBe('2.0')
    expect(doc.querySelector('channel > title')?.textContent).toBe(CHANNEL.title)
    expect(doc.querySelector('channel > link')?.textContent).toBe('https://sector-king.com/news')
    expect(doc.querySelectorAll('item')).toHaveLength(0)
    expect(doc.querySelector('lastBuildDate')).toBeNull()
  })

  it('항목에 제목·링크·guid·발행일·요약·카테고리를 싣는다', () => {
    const doc = parse(buildRssFeed(CHANNEL, [report()]))
    const item = doc.querySelector('item')!
    const link = `https://sector-king.com/news/${ID}`
    expect(item.querySelector('title')?.textContent).toBe('반도체 강세')
    expect(item.querySelector('link')?.textContent).toBe(link)
    expect(item.querySelector('guid')?.textContent).toBe(link)
    expect(item.querySelector('guid')?.getAttribute('isPermaLink')).toBe('true')
    expect(item.querySelector('pubDate')?.textContent).toBe('Fri, 02 Oct 2026 22:30:00 GMT')
    expect(item.querySelector('description')?.textContent).toBe('외국인 매수 유입')
    expect(item.querySelector('category')?.textContent).toBe('반도체')
  })

  it('특수문자가 든 제목·요약·키워드가 XML 을 깨지 않고 원문으로 복원된다', () => {
    const title = 'AT&T <급락> "왜?" ]]> </item>'
    const doc = parse(
      buildRssFeed(CHANNEL, [report({ title, summary: 'S&P 500 < 5,000', keywords: ['R&D'] })])
    )
    expect(doc.querySelectorAll('item')).toHaveLength(1)
    expect(doc.querySelector('item > title')?.textContent).toBe(title)
    expect(doc.querySelector('item > description')?.textContent).toBe('S&P 500 < 5,000')
    expect(doc.querySelector('item > category')?.textContent).toBe('R&D')
  })

  it('요약이 없으면 제목과 날짜로 대체한다', () => {
    const doc = parse(buildRssFeed(CHANNEL, [report({ summary: null })]))
    expect(doc.querySelector('item > description')?.textContent).toBe(
      '반도체 강세 — Sector King 마켓 리포트 (2026-10-02)'
    )
  })

  it('발행 시각이 없으면 리포트 일자를 쓰고, 둘 다 없으면 pubDate 를 생략한다', () => {
    const withDate = parse(buildRssFeed(CHANNEL, [report({ publishedAt: null })]))
    expect(withDate.querySelector('item > pubDate')?.textContent).toBe(
      'Thu, 01 Oct 2026 15:00:00 GMT'
    )
    const none = parse(
      buildRssFeed(CHANNEL, [report({ publishedAt: null, reportDate: null })])
    )
    expect(none.querySelector('item > pubDate')).toBeNull()
  })

  it('lastBuildDate 는 입력 순서와 무관하게 가장 늦은 발행 시각이다', () => {
    const doc = parse(
      buildRssFeed(CHANNEL, [
        report({ id: 'a', publishedAt: '2026-09-30T01:00:00Z' }),
        report({ id: 'b', publishedAt: '2026-10-02T22:30:00Z' }),
        report({ id: 'c', publishedAt: '2026-10-01T01:00:00Z' }),
      ])
    )
    expect(doc.querySelector('lastBuildDate')?.textContent).toBe(
      'Fri, 02 Oct 2026 22:30:00 GMT'
    )
  })

  it('자기 자신을 가리키는 atom:link 를 둔다(피드 검증기 권고)', () => {
    const xml = buildRssFeed(CHANNEL, [])
    expect(xml).toContain(
      '<atom:link href="https://sector-king.com/news/rss.xml" rel="self" type="application/rss+xml" />'
    )
  })

  it('입력 배열을 변경하지 않는다', () => {
    const reports = Object.freeze([Object.freeze(report())])
    expect(() => buildRssFeed(CHANNEL, reports)).not.toThrow()
  })
})
