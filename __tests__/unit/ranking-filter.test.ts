import { describe, it, expect } from 'vitest'
import {
  EMPTY_FILTER,
  applyFilter,
  buildChips,
  hasAnyCondition,
  matchesFilter,
  type RankingFilterState,
} from '@/lib/ranking-filter'
import type { RankingItem } from '@/app/api/rankings/route'

function item(over: Partial<RankingItem> = {}): RankingItem {
  return {
    ticker: 'TEST',
    name: 'Test',
    nameKo: '테스트',
    shortScore: 50,
    longScore: 50,
    momentumPartial: false,
    pickScores: { short: 50, balanced: 50, long: 50 },
    recommendationKey: 'buy',
    analystCount: 10,
    targetMeanPriceUsd: 120,
    upsidePct: 0.2,
    dcfScore: null,
    dcfUpsidePct: null,
    dcfIntrinsicUsd: null,
    dcfAvailable: false,
    dcfReason: null,
    priceUsd: 100,
    marketCapUsd: 1e9,
    returnOnEquity: 0.15,
    operatingMargin: 0.1,
    revenueGrowth: 0.08,
    peRatio: 20,
    pegRatio: null,
    earningsGrowth: null,
    beta: 1.1,
    debtToEquity: null,
    dataQuality: 1,
    sector: { sectorId: 'semiconductor', sectorName: '반도체' },
    ...over,
  } as RankingItem
}

const filter = (over: Partial<RankingFilterState> = {}): RankingFilterState => ({
  ...EMPTY_FILTER,
  ...over,
})

describe('수치 범위 — 입력은 %, 저장은 소수', () => {
  it('ROE 20% 이상 조건에 15% 종목은 걸러진다', () => {
    const f = filter({ ranges: { returnOnEquity: { min: 20 } } })
    expect(matchesFilter(item({ returnOnEquity: 0.15 }), f)).toBe(false)
    expect(matchesFilter(item({ returnOnEquity: 0.25 }), f)).toBe(true)
  })

  it('경계값은 포함한다 (20% 이상에 정확히 20%)', () => {
    const f = filter({ ranges: { returnOnEquity: { min: 20 } } })
    expect(matchesFilter(item({ returnOnEquity: 0.2 }), f)).toBe(true)
  })

  it('PER 같은 배수는 환산 없이 그대로 비교한다', () => {
    const f = filter({ ranges: { peRatio: { max: 15 } } })
    expect(matchesFilter(item({ peRatio: 12 }), f)).toBe(true)
    expect(matchesFilter(item({ peRatio: 20 }), f)).toBe(false)
  })

  it('최소·최대를 함께 걸면 구간이 된다', () => {
    const f = filter({ ranges: { beta: { min: 0.8, max: 1.2 } } })
    expect(matchesFilter(item({ beta: 1.0 }), f)).toBe(true)
    expect(matchesFilter(item({ beta: 0.5 }), f)).toBe(false)
    expect(matchesFilter(item({ beta: 1.5 }), f)).toBe(false)
  })

  it('값이 없는 종목은 통과하지 못한다', () => {
    // "PER 15 이하"를 건 사람은 PER 을 아는 종목 중에서 고르려는 것이다.
    const f = filter({ ranges: { peRatio: { max: 15 } } })
    expect(matchesFilter(item({ peRatio: null }), f)).toBe(false)
  })

  it('조건을 걸지 않은 필드의 결손은 무해하다', () => {
    const f = filter({ ranges: { returnOnEquity: { min: 10 } } })
    expect(matchesFilter(item({ peRatio: null, returnOnEquity: 0.2 }), f)).toBe(true)
  })
})

describe('AND 결합 — 조건이 겹칠수록 좁아진다', () => {
  const rows = [
    item({ ticker: 'A', returnOnEquity: 0.25, upsidePct: 0.4 }),
    item({ ticker: 'B', returnOnEquity: 0.25, upsidePct: 0.1 }),
    item({ ticker: 'C', returnOnEquity: 0.05, upsidePct: 0.4 }),
  ]

  it('두 조건을 모두 만족하는 종목만 남는다', () => {
    const f = filter({
      ranges: { returnOnEquity: { min: 20 }, upsidePct: { min: 30 } },
    })
    expect(applyFilter(rows, f).map((r) => r.ticker)).toEqual(['A'])
  })

  it('섹터 조건이 더해지면 더 좁아진다', () => {
    const rows2 = [
      ...rows,
      item({ ticker: 'D', returnOnEquity: 0.3, upsidePct: 0.5, sector: { sectorId: 'battery', sectorName: '배터리' } }),
    ]
    const f = filter({
      ranges: { returnOnEquity: { min: 20 }, upsidePct: { min: 30 } },
      sectorIds: ['semiconductor'],
    })
    expect(applyFilter(rows2, f).map((r) => r.ticker)).toEqual(['A'])
  })

  it('섹터가 없는 종목은 섹터 조건에서 빠진다', () => {
    const f = filter({ sectorIds: ['semiconductor'] })
    expect(matchesFilter(item({ sector: null }), f)).toBe(false)
  })

  it('투자의견 다중 선택은 OR 로 묶인다 (필드 안에서는 합집합)', () => {
    const f = filter({ recommendations: ['buy', 'strong_buy'] })
    expect(matchesFilter(item({ recommendationKey: 'buy' }), f)).toBe(true)
    expect(matchesFilter(item({ recommendationKey: 'strong_buy' }), f)).toBe(true)
    expect(matchesFilter(item({ recommendationKey: 'hold' }), f)).toBe(false)
  })
})

describe('조건 없음', () => {
  it('빈 필터는 원본을 그대로 돌려준다', () => {
    const rows = [item({ ticker: 'A' }), item({ ticker: 'B', peRatio: null })]
    expect(applyFilter(rows, EMPTY_FILTER)).toHaveLength(2)
    expect(hasAnyCondition(EMPTY_FILTER)).toBe(false)
  })

  it('min/max 가 모두 undefined 인 범위는 조건이 아니다', () => {
    const f = filter({ ranges: { peRatio: {} } })
    expect(hasAnyCondition(f)).toBe(false)
    expect(applyFilter([item({ peRatio: null })], f)).toHaveLength(1)
  })

  it('원본 배열을 변형하지 않는다', () => {
    const rows = [item({ ticker: 'A' })]
    applyFilter(rows, filter({ ranges: { returnOnEquity: { min: 99 } } }))
    expect(rows).toHaveLength(1)
  })
})

describe('조건 칩', () => {
  const names = new Map([['semiconductor', '반도체']])
  const rec = (k: string) => (k === 'buy' ? '매수' : k)

  it('걸린 조건마다 칩이 하나씩 생긴다', () => {
    const f = filter({
      ranges: { returnOnEquity: { min: 20 }, peRatio: { max: 15 } },
      sectorIds: ['semiconductor'],
      recommendations: ['buy'],
    })
    expect(buildChips(f, names, rec).map((c) => c.label)).toEqual([
      'ROE ≥ 20%',
      'PER ≤ 15',
      '반도체',
      '매수',
    ])
  })

  it('한 필드에 최소·최대를 다 걸면 칩이 둘이다 (각각 지울 수 있어야 한다)', () => {
    const f = filter({ ranges: { beta: { min: 0.8, max: 1.2 } } })
    const chips = buildChips(f, names, rec)
    expect(chips).toHaveLength(2)
    expect(chips.map((c) => c.kind === 'range' && c.bound)).toEqual(['min', 'max'])
  })
})
