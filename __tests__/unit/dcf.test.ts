import { describe, it, expect } from 'vitest'
import {
  computeDcf,
  deriveDiscountRate,
  type DcfInput,
  FORECAST_YEARS,
  TERMINAL_GROWTH,
  R_MIN,
  DCF_UPSIDE_LOWER,
  DCF_UPSIDE_SPAN,
} from '@/lib/dcf'

/** USD 종목 기본 입력(toUsd 항등). 개별 테스트에서 필요한 필드만 덮어쓴다. */
function usdInput(overrides: Partial<DcfInput> = {}): DcfInput {
  return {
    freeCashflow: 1000,
    revenueGrowth: 0.08,
    beta: null,
    debtToEquity: null,
    marketCapNative: 5000,
    priceNative: 50,
    marketCapUsd: 5000,
    priceUsd: 50,
    intrinsicToUsd: (x) => x, // USD: 항등
    sector: null,
    ...overrides,
  }
}

/** 등성장(g0 == g_term) 가정의 닫힌형 내재가치 — 루프 구현과 독립 검증용. */
function closedFormIntrinsicPerShare(
  fcf0: number,
  g: number,
  r: number,
  N: number,
  shares: number
): number {
  const q = (1 + g) / (1 + r)
  const pvSum = fcf0 * (q * (1 - Math.pow(q, N))) / (1 - q)
  const fcfN = fcf0 * Math.pow(1 + g, N)
  const tv = (fcfN * (1 + g)) / (r - g)
  const pvTv = tv / Math.pow(1 + r, N)
  return (pvSum + pvTv) / shares
}

describe('불변식', () => {
  it('TERMINAL_GROWTH < R_MIN — TV 분모(r - g_term) 항상 양수', () => {
    expect(TERMINAL_GROWTH).toBeLessThan(R_MIN)
    expect(R_MIN - TERMINAL_GROWTH).toBeGreaterThan(0)
  })
})

describe('deriveDiscountRate', () => {
  it('전부 null → 0.06 + 0.015(beta) + 0.005(de) + 0(size) = 0.08', () => {
    const r = deriveDiscountRate({ beta: null, debtToEquity: null, marketCapUsd: null })
    expect(r).toBeCloseTo(0.08, 10)
  })
  it('대형주 + 저베타 + 저부채 → 하한 근처', () => {
    // 0.06 + 0(beta≤0.8) + 0(de≤0.5) - 0.005(≥200e9) = 0.055 → clamp R_MIN(0.06)
    const r = deriveDiscountRate({ beta: 0.7, debtToEquity: 20, marketCapUsd: 300e9 })
    expect(r).toBe(R_MIN)
  })
  it('고베타 + 고부채 + 소형주 → 가산 합산', () => {
    // 0.06 + 0.03 + 0.02 + 0.01 = 0.12
    const r = deriveDiscountRate({ beta: 2.0, debtToEquity: 200, marketCapUsd: 1e9 })
    expect(r).toBeCloseTo(0.12, 10)
  })
  it('debtToEquity 는 퍼센트라 /100 — 139.511% → de 1.395 → >1.5 아님(0.01)', () => {
    const r = deriveDiscountRate({ beta: 0.5, debtToEquity: 139.511, marketCapUsd: 1e10 })
    // 0.06 + 0 + 0.01 + 0 = 0.07
    expect(r).toBeCloseTo(0.07, 10)
  })
})

describe('가드 — 제외 사유', () => {
  it('FCF ≤ 0 → negativeFcf, 전부 null', () => {
    const res = computeDcf(usdInput({ freeCashflow: -500 }))
    expect(res.dcfReason).toBe('negativeFcf')
    expect(res.dcfAvailable).toBe(false)
    expect(res.dcfScore).toBeNull()
    expect(res.dcfUpsidePct).toBeNull()
    expect(res.dcfIntrinsicUsd).toBeNull()
  })
  it('FCF null → negativeFcf', () => {
    expect(computeDcf(usdInput({ freeCashflow: null })).dcfReason).toBe('negativeFcf')
  })
  it('금융주(Financial Services) → finance (양수 FCF 라도)', () => {
    const res = computeDcf(usdInput({ sector: 'Financial Services', freeCashflow: 1000 }))
    expect(res.dcfReason).toBe('finance')
    expect(res.dcfAvailable).toBe(false)
  })
  it('price 0 → missing, NaN 미누출', () => {
    const res = computeDcf(usdInput({ priceNative: 0, priceUsd: 0 }))
    expect(res.dcfReason).toBe('missing')
    expect(res.dcfScore).toBeNull()
  })
  it('marketCap null → missing(주식수 역산 불가)', () => {
    expect(computeDcf(usdInput({ marketCapNative: null })).dcfReason).toBe('missing')
  })
})

describe('computeDcf — 정상 산출', () => {
  it('등성장(g0=g_term) US 케이스: 닫힌형 손계산과 일치', () => {
    const g = TERMINAL_GROWTH // revenueGrowth=g_term → 클램프 후 g0=g_term
    const fcf0 = 1000
    const shares = 100 // marketCapNative/priceNative = 5000/50
    const input = usdInput({ revenueGrowth: g, freeCashflow: fcf0 })
    const r = deriveDiscountRate(input)

    const expectedPerShare = closedFormIntrinsicPerShare(fcf0, g, r, FORECAST_YEARS, shares)
    const expectedUpside = (expectedPerShare - 50) / 50
    const expectedScore =
      Math.min(Math.max((expectedUpside - DCF_UPSIDE_LOWER) / DCF_UPSIDE_SPAN, 0), 1) * 100

    const res = computeDcf(input)
    expect(res.dcfAvailable).toBe(true)
    expect(res.dcfIntrinsicUsd).toBeCloseTo(expectedPerShare, 6)
    expect(res.dcfUpsidePct).toBeCloseTo(expectedUpside, 10)
    expect(res.dcfScore).toBeCloseTo(expectedScore, 8)
    expect(res.dcfDiscountRate).toBeCloseTo(r, 10)

    // 연도별 예측(#24): N개 행 + PV 합(+잔존가치) = 기업 내재가치 = 주당내재가치×주식수
    expect(res.dcfProjections).toHaveLength(FORECAST_YEARS)
    expect(res.dcfProjections?.map((p) => p.year)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const pvTotal =
      (res.dcfProjections ?? []).reduce((s, p) => s + p.pv, 0) + (res.dcfTerminalPv ?? 0)
    expect(pvTotal).toBeCloseTo(expectedPerShare * shares, 4)
  })

  it('KR(.KS) upside 비율이 환율 상쇄로 USD 와 동일', () => {
    // 동일 네이티브 입력. KR 은 toUsd=÷1450, priceUsd 도 ÷1450.
    // r 을 동일하게 유지하려고 marketCapUsd(규모가산)를 의도적으로 같게 둔다(비율 상쇄만 검증).
    const rate = 1450
    const us = computeDcf(usdInput({ revenueGrowth: 0.1 }))
    const kr = computeDcf(
      usdInput({
        revenueGrowth: 0.1,
        intrinsicToUsd: (x) => x / rate,
        priceUsd: 50 / rate,
        // marketCapUsd 는 규모가산 동일성을 위해 US 와 같은 값 유지
        marketCapUsd: 5000,
      })
    )
    expect(kr.dcfUpsidePct).toBeCloseTo(us.dcfUpsidePct as number, 10)
    // 내재가치 절대값은 환율만큼 작아진다
    expect(kr.dcfIntrinsicUsd).toBeCloseTo((us.dcfIntrinsicUsd as number) / rate, 8)
  })

  it('g0 캡 동작: revenueGrowth 19.52(=1952%) → 0.15 로 클램프', () => {
    const capped = computeDcf(usdInput({ revenueGrowth: 19.52 }))
    const atCap = computeDcf(usdInput({ revenueGrowth: 0.15 }))
    expect(capped.dcfUpsidePct).toBeCloseTo(atCap.dcfUpsidePct as number, 10)
  })
})
