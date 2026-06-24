import { describe, it, expect } from 'vitest'
import { buildStockSignals } from '@/lib/stock-signals'

// 최소 입력으로 P0 룰 다수를 동시에 발화시킨다 (insights=null → P1 룰은 건너뜀).
// 타입 전체를 채우지 않고 룰이 참조하는 필드만 둔다.
const input = {
  detail: {
    score: { recommendationKey: 'buy', dataQuality: 0.95 },
    snapshot: { week52Position: 0.9 },
    analystUpside: { upsidePct: 0.25 },
    dominance: { topRankCount: 2, sectorCount: 3 },
  },
  insights: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

describe('buildStockSignals — 근거·출처·기간 고도화', () => {
  it('모든 시그널에 출처(source)가 비어있지 않게 채워진다', () => {
    const { strengths, cautions } = buildStockSignals(input)
    const all = [...strengths, ...cautions]
    expect(all.length).toBeGreaterThan(0)
    for (const s of all) {
      expect(s.source.length).toBeGreaterThan(0)
      expect(s.evidence.length).toBeGreaterThan(0)
    }
  })

  it('애널리스트 상방 신호는 장기 시계 + 애널리스트 출처를 단다', () => {
    const sig = buildStockSignals(input).strengths.find((s) => s.id === 'analyst-upside')
    expect(sig).toBeDefined()
    expect(sig!.horizon).toBe('long')
    expect(sig!.source).toContain('애널리스트')
  })

  it('52주 신고가 근접은 단기 모멘텀으로 분류된다', () => {
    const sig = buildStockSignals(input).strengths.find((s) => s.id === 'week52-high')
    expect(sig?.horizon).toBe('short')
  })

  it('커버리지/데이터품질 신호는 시계 구분이 없다', () => {
    const noCoverage = buildStockSignals({
      detail: {
        score: { recommendationKey: 'none', dataQuality: 0.6 },
        snapshot: {},
        analystUpside: {},
        dominance: { topRankCount: 0, sectorCount: 1 },
      },
      insights: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).cautions
    const cov = noCoverage.find((s) => s.id === 'no-coverage')
    expect(cov?.horizon).toBeUndefined()
    expect(cov?.source.length).toBeGreaterThan(0)
  })
})
