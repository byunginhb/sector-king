import { describe, it, expect } from 'vitest'
import {
  valueAt,
  weeklyDates,
  toUsdSeries,
  sumBetween,
  changeOver,
  type Pt,
} from '@/lib/global-flow/series'
import { computeRrg, quadrantOf } from '@/lib/global-flow/rrg'
import {
  buildGlobalFlow,
  buildVerdict,
  etfNetCreation,
  netLiquidity,
  riskScore,
  sizeAtEnd,
  type AssetRow,
} from '@/lib/global-flow/compute'
import { ASSETS } from '@/lib/global-flow/assets'

const s = (pairs: [string, number][]): Pt[] => pairs.map(([date, value]) => ({ date, value }))

describe('series', () => {
  const series = s([
    ['2026-01-02', 10],
    ['2026-01-05', 11],
    ['2026-01-09', 12],
  ])

  it('valueAt 은 그 날짜 이하의 마지막 값을 돌려준다(주말·휴장 정렬)', () => {
    expect(valueAt(series, '2026-01-04')).toBe(10)
    expect(valueAt(series, '2026-01-05')).toBe(11)
    expect(valueAt(series, '2026-12-31')).toBe(12)
    expect(valueAt(series, '2025-12-31')).toBeNull()
  })

  it('weeklyDates 는 주마다 마지막 거래일만 남긴다', () => {
    expect(weeklyDates(['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12'])).toEqual([
      '2026-01-09',
      '2026-01-12',
    ])
  })

  it('toUsdSeries 는 같은 날 환율로 나눈다', () => {
    const krw = s([['2026-01-02', 1000]])
    expect(toUsdSeries(s([['2026-01-02', 5000]]), krw)).toEqual(s([['2026-01-02', 5]]))
  })

  it('sumBetween 은 (start, end] 구간만 합산한다', () => {
    expect(sumBetween(series, '2026-01-02', '2026-01-09')).toEqual({ sum: 23, count: 2 })
  })

  it('changeOver 는 0 변화를 null 로 바꾸지 않는다', () => {
    expect(
      changeOver(
        s([
          ['2026-01-01', 5],
          ['2026-01-10', 5],
        ]),
        '2026-01-10',
        9,
      ),
    ).toBe(0)
  })
})

describe('규모 산출', () => {
  const kospi = ASSETS.find((a) => a.id === 'kr_equity')!
  const gspc = ASSETS.find((a) => a.id === 'us_equity')!

  it('KRW 기준 시총은 기준일 환율로 USD 환산 후 USD 가격 비율로 굴린다', () => {
    // 기준일: 지수 2,000 · 1,500원/$ → 시총 1,963조원 = $1.3087T. 지금: 지수 4,000 · 1,000원/$
    // USD 가격 = 2000/1500 → 4000/1000 (3배) → $3.926T
    const prices = new Map([
      [
        'KRW=X',
        s([
          ['2024-12-30', 1500],
          ['2026-10-01', 1000],
        ]),
      ],
    ])
    const usd = s([
      ['2024-12-30', 2000 / 1500],
      ['2026-10-01', 4],
    ])
    const size = sizeAtEnd(kospi, usd, '2026-10-01', { prices, macro: new Map() })
    expect(size! / 1e12).toBeCloseTo((1963 / 1500) * 3, 3)
  })

  it('기준일 가격이 이력에 없으면 null — 0 이나 잘못된 값으로 대체하지 않는다', () => {
    const usd = s([['2025-06-01', 100]])
    expect(sizeAtEnd(gspc, usd, '2025-06-01', { prices: new Map(), macro: new Map() })).toBeNull()
  })
})

describe('순유동성', () => {
  it('WALCL·TGA(백만$) 와 역레포(십억$) 단위를 맞춘다', () => {
    const out = netLiquidity(
      s([['2026-10-07', 6_747_560]]),
      s([['2026-10-07', 880_253]]),
      s([['2026-10-06', 0.3]]),
    )
    expect(out[0].value).toBeCloseTo(6_747_560e6 - 880_253e6 - 0.3e9, -3)
  })
})

describe('ETF 순설정', () => {
  // 좌수 100 → 110 → 105, 좌당 $10 → 순설정 +100 − 50 = +$50
  const shares = s([
    ['2026-10-01', 100],
    ['2026-10-02', 110],
    ['2026-10-03', 105],
  ])
  const aum = s([
    ['2026-10-01', 1000],
    ['2026-10-02', 1100],
    ['2026-10-03', 1050],
  ])

  it('좌수 변화 × 좌당가치를 합산한다(가격 효과 제외)', () => {
    expect(etfNetCreation(shares, aum, '2026-09-30', '2026-10-03')).toEqual({
      flow: 50,
      observations: 2,
    })
  })

  it('구간 밖 변화는 넣지 않는다', () => {
    expect(etfNetCreation(shares, aum, '2026-10-02', '2026-10-03')).toEqual({
      flow: -50,
      observations: 1,
    })
  })

  it('관측이 하나뿐이면 흐름을 만들지 않는다', () => {
    expect(etfNetCreation(shares.slice(0, 1), aum, '2026-09-01', '2026-10-03').observations).toBe(0)
  })
})

describe('판정', () => {
  const row = (risk: AssetRow['risk'], returnPct: number): AssetRow => ({
    id: `${risk}${returnPct}`,
    name: `${risk}${returnPct}`,
    group: 'equity',
    risk,
    returnPct,
    sizeUsd: null,
    valueChangeUsd: null,
  })

  it('위험 선호 점수 = 위험 평균 − 안전 평균, neutral 은 제외', () => {
    expect(riskScore([row('risk', 6), row('risk', 2), row('safe', 1), row('neutral', 50)])).toBe(3)
  })

  it('임계값을 넘으면 방향을, 못 넘으면 중립을 낸다', () => {
    expect(buildVerdict('1m', [row('risk', 5), row('safe', 0)], 2, -2).risk).toBe('on')
    expect(buildVerdict('1m', [row('risk', 0), row('safe', 5)], null, null).risk).toBe('off')
    const flat = buildVerdict('1m', [row('risk', 1), row('safe', 0)], 0, 0)
    expect(flat.risk).toBe('neutral')
    expect(flat.sentence).toBe('최근 1개월, 뚜렷한 쏠림 없음 · 유동성 횡보 · 달러 보합')
  })

  it('데이터가 없으면 단정하지 않는다', () => {
    const v = buildVerdict('1w', [], null, null)
    expect(v.risk).toBeNull()
    expect(v.sentence).toBe('판정할 데이터가 부족합니다')
  })
})

describe('RRG', () => {
  it('사분면은 (100,100) 기준으로 나뉜다', () => {
    expect(quadrantOf(101, 101)).toBe('leading')
    expect(quadrantOf(101, 99)).toBe('weakening')
    expect(quadrantOf(99, 99)).toBe('lagging')
    expect(quadrantOf(99, 101)).toBe('improving')
  })

  it('최근에 가속하는 자산은 주도, 최근에 꺾인 자산은 약세 쪽에 놓인다', () => {
    const weeks = Array.from(
      { length: 30 },
      (_, i) =>
        `2026-${String(1 + Math.floor(i / 4)).padStart(2, '0')}-${String(1 + (i % 4) * 7).padStart(2, '0')}`,
    )
    const up = weeks.map((date, i) => ({ date, value: i < 20 ? 100 : 100 * 1.03 ** (i - 19) }))
    const down = weeks.map((date, i) => ({ date, value: i < 20 ? 100 : 100 * 0.97 ** (i - 19) }))
    const flat = weeks.map((date) => ({ date, value: 100 }))
    const res = computeRrg(
      [
        { id: 'up', usd: up },
        { id: 'down', usd: down },
        { id: 'flat', usd: flat },
      ],
      weeks,
    )
    expect(res.find((r) => r.id === 'up')!.quadrant).toBe('leading')
    expect(res.find((r) => r.id === 'down')!.quadrant).toBe('lagging')
    expect(res.every((r) => r.tail.length === 8)).toBe(true)
  })

  it('주가 부족하면 빈 배열', () => {
    expect(computeRrg([{ id: 'a', usd: [] }], ['2026-01-02'])).toEqual([])
  })
})

describe('buildGlobalFlow', () => {
  it('달력 기준 심볼이 없으면 null', () => {
    expect(buildGlobalFlow({ prices: new Map(), macro: new Map() })).toBeNull()
  })

  it('4개 기간을 모두 만들고, 수집 전 통로는 null 로 둔다', () => {
    const prices = new Map([
      [
        '^GSPC',
        s([
          ['2025-09-01', 100],
          ['2026-10-12', 120],
        ]),
      ],
      [
        'GC=F',
        s([
          ['2025-09-01', 3000],
          ['2026-10-12', 4000],
        ]),
      ],
    ])
    const p = buildGlobalFlow({ prices, macro: new Map() })!
    expect(Object.keys(p.periods)).toEqual(['1w', '1m', '3m', '1y'])
    const gold = p.periods['1y'].assets.find((a) => a.id === 'gold')!
    expect(gold.returnPct).toBeCloseTo(33.33, 1)
    // 가치 변화 = 끝 규모 − 시작 규모
    expect(gold.valueChangeUsd! / gold.sizeUsd!).toBeCloseTo(1 - 3000 / 4000, 6)
    expect(p.periods['1y'].channels.etf).toBeNull()
    expect(p.liquidity).toBeNull()
  })
})
