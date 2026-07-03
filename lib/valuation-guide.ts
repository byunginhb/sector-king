/**
 * 산업/기업 유형별 핵심 밸류에이션 지표 안내 (SoT).
 *
 * 종목 상세의 "핵심 지표" 배지(valuation-compare)와 /guide 교육 테이블이
 * 이 한 곳을 공유한다. 지표 자체는 무차원 비율 → 통화 변환 무관.
 */

export type ValuationMetricKey = 'peRatio' | 'priceToBook' | 'evToEbitda'

export interface KeyValuationMetric {
  key: ValuationMetricKey
  label: string
  /** 왜 이 지표가 핵심인지 (1줄). */
  reason: string
  /** 함께 봐야 할 지표. */
  companion: string
}

/**
 * yfinance GICS 섹터(company_profiles.sector) → 핵심 지표.
 * 미기재(null)·미매핑 섹터는 이익 중심 PER 을 기본값으로 둔다
 * (Technology·Healthcare·Consumer·Industrials 등이 여기 해당).
 */
const SECTOR_KEY_METRIC: Record<string, ValuationMetricKey> = {
  'Financial Services': 'priceToBook',
  'Real Estate': 'priceToBook',
  Energy: 'evToEbitda',
  Utilities: 'evToEbitda',
  'Communication Services': 'evToEbitda',
  'Basic Materials': 'evToEbitda',
}

const METRIC_META: Record<ValuationMetricKey, Omit<KeyValuationMetric, 'key'>> = {
  peRatio: {
    label: 'PER',
    reason: '이익 기반 성장·기술주에 적합. 이익이 꾸준한 기업일수록 유효.',
    companion: '선행 PER·산업 사이클과 함께 해석',
  },
  priceToBook: {
    label: 'PBR',
    reason: '자산·자본 비중이 큰 금융·부동산업에 적합. 이익 변동에 덜 민감.',
    companion: 'ROE와 함께 해석 (저PBR·고ROE = 저평가 신호)',
  },
  evToEbitda: {
    label: 'EV/EBITDA',
    reason: '설비·부채·감가상각이 큰 에너지·통신·소재업에 적합. 자본구조 차이 보정.',
    companion: '부채·설비투자(capex) 수준과 함께 해석',
  },
}

/** GICS 섹터 문자열로 핵심 밸류에이션 지표를 결정한다. 항상 값을 반환(기본 PER). */
export function keyMetricForSector(
  sector: string | null | undefined
): KeyValuationMetric {
  const key = (sector && SECTOR_KEY_METRIC[sector]) || 'peRatio'
  return { key, ...METRIC_META[key] }
}

/** /guide 교육용 — 기업 유형별 중심 지표 매핑 테이블. */
export const VALUATION_GUIDE_ROWS = [
  {
    type: '성장주·기술주, 이익이 꾸준한 기업',
    metric: 'PER',
    companion: '선행 PER + 산업 사이클',
  },
  {
    type: '금융업·부동산 등 자산 비중이 큰 기업',
    metric: 'PBR',
    companion: 'ROE (저PBR·고ROE = 저평가)',
  },
  {
    type: '에너지·통신·소재 등 설비·부채가 큰 기업',
    metric: 'EV/EBITDA',
    companion: '부채·설비투자(capex)',
  },
] as const
