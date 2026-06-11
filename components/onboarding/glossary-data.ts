export type GlossaryCategory = 'score' | 'flow' | 'market' | 'general'

export interface GlossaryTerm {
  id: string
  term: string
  description: string
  category: GlossaryCategory
}

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, string> = {
  score: '점수',
  flow: '자금흐름',
  market: '시장',
  general: '일반',
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'hegemony-score',
    term: '패권 점수 (Hegemony Score)',
    description:
      '기업의 시장 지배력을 100점 만점으로 평가하는 종합 점수입니다. 규모(시가총액), 성장(매출/EPS 성장률), 수익성(마진), 시장평가(PER/PBR) 4가지 차원으로 구성됩니다.',
    category: 'score',
  },
  {
    id: 'scale-score',
    term: '규모 점수',
    description:
      '시가총액 기준으로 산출되는 점수입니다. 섹터 내에서 시가총액이 클수록 높은 점수를 받습니다.',
    category: 'score',
  },
  {
    id: 'growth-score',
    term: '성장 점수',
    description:
      '매출 성장률과 EPS(주당순이익) 성장률을 기반으로 산출됩니다. 빠르게 성장하는 기업일수록 높은 점수를 받습니다.',
    category: 'score',
  },
  {
    id: 'profitability-score',
    term: '수익성 점수',
    description:
      '영업이익률, 순이익률 등 마진 지표를 기반으로 산출됩니다. 효율적으로 수익을 내는 기업일수록 높은 점수를 받습니다.',
    category: 'score',
  },
  {
    id: 'sentiment-score',
    term: '시장평가 점수',
    description:
      'PER(주가수익비율), PBR(주가순자산비율) 등 밸류에이션 지표를 기반으로 산출됩니다. 시장에서 높게 평가받는 기업일수록 높은 점수를 받습니다.',
    category: 'score',
  },
  {
    id: 'mfi',
    term: 'MFI (Money Flow Index)',
    description:
      '0~100 사이로 매수압력을 나타내는 지표입니다. 50 이상이면 매수 우위, 50 미만이면 매도 우위로 해석합니다. 이 서비스의 MFI는 당일 종가의 일중 위치(고가·저가 사이)를 기준으로 계산하며, 전일 대비 방향을 쓰는 표준 Wilder MFI와는 다릅니다.',
    category: 'flow',
  },
  {
    id: 'inflow',
    term: '자금 유입',
    description:
      '선택한 기간 동안 섹터의 시가총액이 증가한 상태를 의미합니다. 다만 주가 상승에 의한 평가액 증가를 포함하며, 실제 순매수 자금을 의미하지 않습니다(모든 거래는 매수=매도라 순유입은 측정 불가). 해당 섹터의 시총이 늘었다는 뜻으로 읽으세요.',
    category: 'flow',
  },
  {
    id: 'outflow',
    term: '자금 유출',
    description:
      '선택한 기간 동안 섹터의 시가총액이 감소한 상태를 의미합니다. 주가 하락에 의한 평가액 감소를 포함하며, 실제 순매도 자금을 의미하지 않습니다. 해당 섹터의 시총이 줄었다는 뜻으로 읽으세요.',
    category: 'flow',
  },
  {
    id: 'market-cap',
    term: '시가총액',
    description:
      '기업의 발행 주식 수에 현재 주가를 곱한 값으로, 기업의 시장 가치를 나타냅니다. B(Billion, 10억 달러), T(Trillion, 1조 달러) 단위로 표시됩니다.',
    category: 'market',
  },
  {
    id: 'category',
    term: '카테고리',
    description:
      '산업을 구성하는 큰 분류입니다. 예를 들어 테크 산업은 반도체, 소프트웨어, 클라우드 등의 카테고리로 나뉩니다.',
    category: 'general',
  },
  {
    id: 'sector',
    term: '섹터',
    description:
      '카테고리 안의 세부 분류입니다. 예를 들어 반도체 카테고리 안에 AI 가속기, 파운드리 등의 섹터가 있습니다. 각 섹터에는 관련 기업들이 배치됩니다.',
    category: 'general',
  },
  {
    id: 'ema-smoothing',
    term: 'EMA 스무딩',
    description:
      '지수이동평균(Exponential Moving Average)을 사용하여 패권 점수의 급격한 변동을 완화하는 기법입니다. 최근 데이터에 더 높은 가중치를 부여하여 안정적인 순위를 산출합니다.',
    category: 'general',
  },
]
