import { describe, it, expect } from 'vitest'
import {
  COMPANY_SUMMARIES,
  SUMMARY_COUNT,
  getCompanySummaries,
  getCompanySummary,
} from '@/lib/company-summaries'

/**
 * 한 줄 설명은 카드 한 줄에 들어가야 하고, 없으면 화면이 섹터명으로 폴백한다.
 * 길이·중복 같은 것은 사람이 매번 세지 않으므로 여기서 고정한다.
 */
describe('COMPANY_SUMMARIES — 문장 규칙', () => {
  it('모든 설명이 카드 한 줄 길이를 넘지 않는다', () => {
    const tooLong = Object.entries(COMPANY_SUMMARIES).filter(
      ([, text]) => text.length > 60
    )
    expect(tooLong.map(([t, s]) => `${t}(${s.length}자)`)).toEqual([])
  })

  it('너무 짧아 아무 정보가 없는 문장이 없다', () => {
    const tooShort = Object.entries(COMPANY_SUMMARIES).filter(
      ([, text]) => text.trim().length < 10
    )
    expect(tooShort.map(([t]) => t)).toEqual([])
  })

  it('앞뒤 공백이나 줄바꿈이 없다', () => {
    for (const [ticker, text] of Object.entries(COMPANY_SUMMARIES)) {
      expect(text, ticker).toBe(text.trim())
      expect(text.includes('\n'), ticker).toBe(false)
    }
  })

  it('같은 문장이 두 종목에 붙어 있지 않다', () => {
    // 복사해 붙이다 회사명만 안 고친 경우를 잡는다.
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const [ticker, text] of Object.entries(COMPANY_SUMMARIES)) {
      const prev = seen.get(text)
      if (prev) dupes.push(`${prev} = ${ticker}`)
      else seen.set(text, ticker)
    }
    expect(dupes).toEqual([])
  })
})

describe('조회', () => {
  it('없는 티커는 null 이다 (화면이 섹터명으로 폴백한다)', () => {
    expect(getCompanySummary('__NOT_A_TICKER__')).toBe(null)
  })

  it('있는 티커는 문장을 돌려준다', () => {
    expect(getCompanySummary('NVDA')).toContain('GPU')
  })

  it('여러 건 조회는 있는 것만 담는다', () => {
    const map = getCompanySummaries(['NVDA', '__NONE__', 'AAPL'])
    expect(map.size).toBe(2)
    expect(map.has('__NONE__')).toBe(false)
  })

  it('빈 목록도 안전하다', () => {
    expect(getCompanySummaries([]).size).toBe(0)
  })

  it('작성 건수가 집계된다 (진행 상황 확인용)', () => {
    expect(SUMMARY_COUNT).toBe(Object.keys(COMPANY_SUMMARIES).length)
    expect(SUMMARY_COUNT).toBeGreaterThan(50)
  })
})
