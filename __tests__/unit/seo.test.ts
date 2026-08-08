import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

/**
 * SEO 인프라 회귀 가드.
 *
 * 여기서 잡으려는 실제 사고 3건:
 *  1. robots 가 `/_next/*` 를 막아 렌더링 필수 JS/CSS 를 차단했다(색인 붕괴).
 *  2. sitemap 의 모든 URL 이 배포 시각을 lastmod 로 써서 "매일 전 페이지가 바뀐다"는
 *     거짓 신호를 보냈다.
 *  3. 신뢰 페이지(/about, /methodology, /contact)와 뉴스 상세가 sitemap 에서 빠졌다.
 */

describe('robots.txt', () => {
  const rules = robots()
  const groups = Array.isArray(rules.rules) ? rules.rules : [rules.rules!]

  it('렌더링에 필요한 /_next 경로를 어떤 그룹도 막지 않는다', () => {
    for (const group of groups) {
      const disallow = [group.disallow ?? []].flat()
      expect(disallow.some((path) => path.startsWith('/_next'))).toBe(false)
    }
  })

  it('비공개 경로는 모든 그룹에서 막는다', () => {
    for (const group of groups) {
      const disallow = [group.disallow ?? []].flat()
      expect(disallow).toContain('/admin/')
      expect(disallow).toContain('/me/')
      expect(disallow).toContain('/auth/')
    }
  })

  it('검색·인용 봇을 학습 봇과 별도 그룹으로 둔다', () => {
    // 학습 봇 정책을 바꿀 때 검색 봇까지 같이 막히면 인용 후보에서 사라진다.
    const searchGroup = groups.find((g) =>
      [g.userAgent ?? []].flat().includes('OAI-SearchBot')
    )
    const trainingGroup = groups.find((g) => [g.userAgent ?? []].flat().includes('GPTBot'))

    expect(searchGroup).toBeDefined()
    expect(trainingGroup).toBeDefined()
    expect(searchGroup).not.toBe(trainingGroup)
    expect([searchGroup!.userAgent ?? []].flat()).toContain('PerplexityBot')
  })

  it('sitemap 을 선언한다', () => {
    expect(rules.sitemap).toMatch(/\/sitemap\.xml$/)
  })
})

describe('sitemap.xml', () => {
  it('URL 중복이 없고 전부 절대 경로다', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)

    expect(urls.length).toBeGreaterThan(0)
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) expect(url).toMatch(/^https?:\/\//)
  })

  it('신뢰·설명 페이지가 빠지지 않는다', async () => {
    const urls = new Set((await sitemap()).map((e) => e.url))
    for (const path of ['/about', '/methodology', '/contact', '/guide', '/news']) {
      expect([...urls].some((u) => u.endsWith(path))).toBe(true)
    }
  })

  it('lastmod 가 전부 같은 값이 아니다 — 배포 시각 일괄 입력 방지', async () => {
    const stamps = new Set(
      (await sitemap()).map((e) =>
        e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified)
      )
    )
    expect(stamps.size).toBeGreaterThan(1)
  })

  it('lastmod 에 미래 날짜나 Invalid Date 가 없다', async () => {
    const now = Date.now()
    for (const entry of await sitemap()) {
      const time = new Date(entry.lastModified as string | Date).getTime()
      expect(Number.isNaN(time)).toBe(false)
      // 하루 여유 — 데이터 기준일이 UTC 자정으로 저장되는 경우 대비.
      expect(time).toBeLessThanOrEqual(now + 86_400_000)
    }
  })
})
