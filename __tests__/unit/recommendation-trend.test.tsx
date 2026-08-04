import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecommendationTrend } from '@/components/stock/insights/recommendation-trend'
import type { RecommendationTrendPoint } from '@/types'

const TSLA: RecommendationTrendPoint[] = [
  { period: '0m', strongBuy: 6, buy: 17, hold: 18, sell: 4, strongSell: 2 },
  { period: '-1m', strongBuy: 6, buy: 17, hold: 18, sell: 4, strongSell: 2 },
  { period: '-2m', strongBuy: 5, buy: 18, hold: 19, sell: 4, strongSell: 2 },
]

describe('RecommendationTrend', () => {
  it('기간별 총원과 등급 범례를 렌더한다', () => {
    render(<RecommendationTrend points={TSLA} />)

    expect(screen.getByText('이번 달')).toBeInTheDocument()
    expect(screen.getByText('2개월 전')).toBeInTheDocument()
    // 보유·매도 등급이 노출되는 것이 issue#33 의 핵심
    expect(screen.getByText('보유')).toBeInTheDocument()
    expect(screen.getByText('매도')).toBeInTheDocument()
    expect(screen.getByText('적극 매도')).toBeInTheDocument()
  })

  it('막대에 스크린리더용 인원 내역을 붙인다', () => {
    render(<RecommendationTrend points={TSLA} />)

    expect(
      screen.getByLabelText(
        '이번 달 투자의견 47명 — 적극 매수 6명, 매수 17명, 보유 18명, 매도 4명, 적극 매도 2명'
      )
    ).toBeInTheDocument()
  })

  it('데이터가 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<RecommendationTrend points={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
