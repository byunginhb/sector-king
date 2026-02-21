/**
 * Hegemony Score 산출 방법론 상수
 *
 * 4개 차원, 100점 만점
 * - 규모(Scale): 35점 - 섹터 내 시가총액 비중과 거래 활성도
 * - 성장성(Growth): 30점 - 분기별 매출/수익 성장률
 * - 수익성(Profitability): 20점 - 영업이익률과 ROE
 * - 시장 평가(Sentiment): 15점 - 애널리스트 투자의견과 목표주가 괴리율
 *
 * 데이터 품질(dataQuality): 실제 수집된 지표 비율 (0.0~1.0)
 * 업데이트 주기: 시총/거래량은 매일, 재무/애널리스트 지표는 주간
 */

export const SCORING = {
  scale: {
    maxScore: 35,
    marketCapShare: { maxScore: 20 },
    volumeRatio: { maxScore: 15, cap: 3.0 },
  },
  growth: {
    maxScore: 30,
    revenueGrowth: { maxScore: 15, min: -0.5, max: 1.0 },
    earningsGrowth: { maxScore: 15, min: -1.0, max: 2.0 },
  },
  profitability: {
    maxScore: 20,
    operatingMargin: { maxScore: 10, min: -0.2, max: 0.5 },
    returnOnEquity: { maxScore: 10, min: -0.2, max: 0.6 },
  },
  sentiment: {
    maxScore: 15,
    recommendation: {
      maxScore: 8,
      // IMPORTANT: Keep in sync with scripts/scoring.py RECOMMENDATION_SCORES
      mapping: {
        strong_buy: 8,
        buy: 6,
        hold: 4,
        underperform: 2,
        sell: 1,
        none: 4,
      } as Record<string, number>,
    },
    targetUpside: { maxScore: 7, min: -0.3, max: 0.6 },
  },
  ema: {
    alpha: 0.3,
  },
  totalMaxScore: 100,
} as const
