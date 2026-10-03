import { describe, expect, it } from 'vitest'
import { getKrwRate } from '@/lib/currency'
import { buildStockDescription } from '@/lib/stock-meta'
import type { StockServerFacts } from '@/lib/stock-server'

const base = {
  name: 'AppLovin',
  nameKo: '앱러빈',
  date: '2026-10-02',
  priceChangePct: 1.5,
  week52HighUsd: null,
  week52LowUsd: null,
  sectors: [],
  industries: [],
} as unknown as StockServerFacts

describe('buildStockDescription', () => {
  it('US 종목은 달러로 주가·시총을 싣는다', () => {
    const d = buildStockDescription('앱러빈', { ...base, ticker: 'APP', priceUsd: 612.3, marketCapUsd: 2.07e11 })
    expect(d).toContain('주가 $612.30(+1.50%)')
    expect(d).toContain('시가총액 $207.00B')
    expect(d).toContain('2026-10-02 기준')
  })

  it('국내 종목은 원화로 표기한다 (USD 입력을 환산, raw 원값 아님)', () => {
    const d = buildStockDescription('삼성전자', { ...base, ticker: '005930.KS', priceUsd: 50, marketCapUsd: 3e11 })
    expect(d).toContain(`주가 ₩${Math.round(50 * getKrwRate()).toLocaleString()}`)
    expect(d).not.toContain('$')
  })

  it('수치가 없으면 숫자 문장을 생략한다', () => {
    const d = buildStockDescription('앱러빈', { ...base, ticker: 'APP', priceUsd: null, marketCapUsd: null })
    expect(d).not.toContain('주가 ')
    expect(d).not.toContain('기준')
  })
})
