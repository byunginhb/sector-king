import { describe, it, expect } from 'vitest'
import {
  SEARCHABLE_FEATURES,
  buildIndustryEntries,
  matchFeatures,
} from '@/lib/site-search'

const INDUSTRIES = [
  { id: 'tech', name: '테크' },
  { id: 'healthcare', name: '헬스케어' },
  { id: 'defense', name: '방산' },
]

const ALL = [...SEARCHABLE_FEATURES, ...buildIndustryEntries(INDUSTRIES)]

describe('SEARCHABLE_FEATURES — 목록 불변식', () => {
  it('href 가 중복되지 않는다', () => {
    const hrefs = SEARCHABLE_FEATURES.map((f) => f.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('전부 내부 절대경로다 (외부 링크가 섞이면 검색이 이탈 경로가 된다)', () => {
    for (const f of SEARCHABLE_FEATURES) {
      expect(f.href.startsWith('/')).toBe(true)
      expect(f.href.startsWith('//')).toBe(false)
    }
  })

  it('로그인 잠금 화면(/me/**)과 법적 문서를 넣지 않는다', () => {
    // 비로그인 사용자가 검색 결과에서 접근 거부 화면에 착지하면 그것대로 사고다.
    for (const f of SEARCHABLE_FEATURES) {
      // `/methodology` 가 걸리지 않도록 경계를 정확히 본다.
      expect(f.href === '/me' || f.href.startsWith('/me/')).toBe(false)
      expect(['/terms', '/privacy', '/login']).not.toContain(f.href)
    }
  })
})

describe('buildIndustryEntries', () => {
  it('산업마다 대시보드 + 하위 3화면을 만든다', () => {
    const entries = buildIndustryEntries([{ id: 'tech', name: '테크' }])
    expect(entries.map((e) => e.href)).toEqual([
      '/tech',
      '/tech/money-flow',
      '/tech/price-changes',
      '/tech/statistics',
    ])
    expect(entries[0].label).toBe('테크')
    expect(entries[1].label).toBe('테크 자금 흐름')
  })

  it('빈 목록이면 아무것도 만들지 않는다 (industries 로딩 전)', () => {
    expect(buildIndustryEntries([])).toEqual([])
  })
})

describe('matchFeatures — 매칭과 순위', () => {
  it('빈 검색어는 결과가 없다 (모달 초기 상태)', () => {
    expect(matchFeatures(ALL, '')).toEqual([])
    expect(matchFeatures(ALL, '   ')).toEqual([])
  })

  it('라벨 앞부분이 맞으면 포함 매칭보다 위로 온다', () => {
    const hits = matchFeatures(ALL, '섹터')
    // '섹터 목록'(앞부분) 이 '섹터 로테이션'(앞부분) 및 '섹터킹 픽' 과 함께 뜨되,
    // 설명·별칭으로만 걸린 항목보다 앞선다.
    expect(hits[0].label.startsWith('섹터')).toBe(true)
    const scores = hits.map((h) => h.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('별칭으로도 찾힌다 — 라벨에 없는 말이 실제 검색어다', () => {
    expect(matchFeatures(ALL, '시총').some((h) => h.href === '/market-size')).toBe(
      true
    )
    expect(matchFeatures(ALL, '요금').some((h) => h.href === '/pricing')).toBe(true)
    expect(matchFeatures(ALL, '목표주가').some((h) => h.href === '/analysts')).toBe(
      true
    )
  })

  it('영문 별칭은 대소문자를 가리지 않는다', () => {
    expect(matchFeatures(ALL, 'PRO').some((h) => h.href === '/pricing')).toBe(true)
    expect(matchFeatures(ALL, 'Ranking').some((h) => h.href === '/rankings')).toBe(
      true
    )
  })

  it('산업명으로 검색하면 그 산업의 화면들이 나온다', () => {
    const hits = matchFeatures(ALL, '테크')
    const hrefs = hits.map((h) => h.href)
    expect(hrefs).toContain('/tech')
    expect(hrefs.some((h) => h.startsWith('/tech/'))).toBe(true)
    // 다른 산업은 섞이지 않는다.
    expect(hrefs.some((h) => h.startsWith('/healthcare'))).toBe(false)
  })

  it('산업 대시보드가 그 산업의 하위 화면보다 위다', () => {
    const hits = matchFeatures(ALL, '방산')
    expect(hits[0].href).toBe('/defense')
  })

  it('limit 을 넘기지 않는다 — 결과 도배 방지', () => {
    // '자금'·'통계' 는 산업 수만큼 후보가 생긴다(9개 산업이면 9건).
    expect(matchFeatures(ALL, '자금', 6).length).toBeLessThanOrEqual(6)
    expect(matchFeatures(ALL, '통계', 3).length).toBeLessThanOrEqual(3)
  })

  it('매칭이 없으면 빈 배열이다 (종목만 있는 검색어)', () => {
    expect(matchFeatures(ALL, 'NVDA')).toEqual([])
    expect(matchFeatures(ALL, 'zzzzz')).toEqual([])
  })

  it('원본 배열을 변형하지 않는다', () => {
    const before = JSON.stringify(ALL)
    matchFeatures(ALL, '섹터')
    expect(JSON.stringify(ALL)).toBe(before)
  })
})
