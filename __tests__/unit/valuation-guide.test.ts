import { describe, it, expect } from 'vitest'
import { keyMetricForSector } from '@/lib/valuation-guide'

describe('keyMetricForSector', () => {
  it('금융·부동산 → PBR', () => {
    expect(keyMetricForSector('Financial Services').key).toBe('priceToBook')
    expect(keyMetricForSector('Real Estate').key).toBe('priceToBook')
  })

  it('에너지·유틸·통신·소재 → EV/EBITDA', () => {
    expect(keyMetricForSector('Energy').key).toBe('evToEbitda')
    expect(keyMetricForSector('Utilities').key).toBe('evToEbitda')
    expect(keyMetricForSector('Communication Services').key).toBe('evToEbitda')
    expect(keyMetricForSector('Basic Materials').key).toBe('evToEbitda')
  })

  it('이익 중심·미매핑·null → PER 기본값', () => {
    expect(keyMetricForSector('Technology').key).toBe('peRatio')
    expect(keyMetricForSector('Healthcare').key).toBe('peRatio')
    expect(keyMetricForSector('알수없는섹터').key).toBe('peRatio')
    expect(keyMetricForSector(null).key).toBe('peRatio')
    expect(keyMetricForSector(undefined).key).toBe('peRatio')
  })

  it('label·reason·companion 을 항상 채워 반환', () => {
    const m = keyMetricForSector('Financial Services')
    expect(m.label).toBe('PBR')
    expect(m.reason.length).toBeGreaterThan(0)
    expect(m.companion.length).toBeGreaterThan(0)
  })
})
