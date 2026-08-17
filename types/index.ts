// Re-export Drizzle types
export type {
  Category,
  Sector,
  Company,
  SectorCompany,
  DailySnapshot,
  CompanyProfile,
  Industry,
  IndustryCategory,
  CompanyScore,
  ScoreHistory,
} from '@/drizzle/schema'

// Re-export region types (SoT: lib/region.ts)
export type { RegionValue, RegionFilter } from '@/lib/region'

import type { RegionFilter as _RegionFilter } from '@/lib/region'

/**
 * 산업 + region 합성 결과. API 라우트가 필터 체인 종료 시점에 보유하는 통합 컨텍스트.
 *
 * - `industryId === null` 이면 전 산업 대상.
 * - `tickers === null` 이면 ticker 단위 사전 좁힘이 없다는 뜻 (SQL 단계에서 region 분기).
 */
export interface ResolvedFilter {
  industryId: string | null
  region: _RegionFilter
  categoryIds: string[] | null
  sectorIds: string[] | null
  tickers: string[] | null
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ── 애널리스트 성적표 (analyst report card) ─────────────────────────────
import type { Direction, PredictionStatus } from '@/lib/analyst-consensus/accuracy'
export type { Direction, PredictionStatus }

/** 랭킹 한 줄. score=예측력 점수(0~100, Wilson 하한), hitRate 0..1(원 적중률, 보조), scored=채점 표본 수. */
export interface AnalystLeaderboardRow {
  analystId: number
  name: string
  firm: string
  score: number // 예측력 점수 0~100 (정렬 주키)
  hitRate: number | null
  scored: number
  hits: number
  tickersCovered: number
  reportCount: number
}

/**
 * 증권사(기관) 단위 롤업 행. 소속 애널리스트의 예측을 합산한 결과이며
 * 점수 산식은 개인과 동일(Wilson 하한).
 */
export interface FirmLeaderboardRow {
  firm: string
  analystCount: number
  reportCount: number
  scored: number
  hits: number
  hitRate: number | null
  score: number
  /** 소속 애널들의 커버 종목 수 합(중복 포함) — 커버 활동량 지표. */
  tickersCovered: number
}

export interface AnalystLeaderboardResponse {
  ranked: AnalystLeaderboardRow[] // 예측력 점수 내림차순 (표본 부족 별도 분리 없음)
  byReports: AnalystLeaderboardRow[] // 리포트 수 내림차순 (채점 표본 없는 애널도 포함)
  /** 증권사 롤업 — 점수 내림차순. 표본 하한 필터는 화면이 적용한다. */
  firms: FirmLeaderboardRow[]
}

/** 목표가 포인트(USD). */
export interface AnalystTargetPoint {
  date: string
  /**
   * 채점 구간의 끝 — 같은 (애널리스트, 종목)의 **다음 리포트 발간일**.
   * 마지막 리포트는 오늘이며 그때 `inProgress: true`.
   *
   * 목표주가에는 달성 시점이 명시되지 않으므로(국내 리서치 관행), 시점 대신
   * "다음 리포트까지의 방향"으로 평가한다. 이 필드가 그 구간을 화면에 드러낸다.
   */
  endDate: string
  target: number
  direction: Direction
  status: PredictionStatus
  actualReturn: number | null
  inProgress: boolean
  grade: string | null
  reportTitle: string | null
  pdfUrl: string | null
  thumbnailUrl: string | null
}

/** 실제 주가 포인트(USD). */
export interface AnalystPricePoint {
  date: string
  price: number
}

/** 겹쳐보기용 다른 애널리스트 목표가선(USD). */
export interface AnalystOverlaySeries {
  analystId: number
  name: string
  firm: string
  points: { date: string; target: number }[]
}

export interface AnalystTickerSeries {
  ticker: string
  businessName: string
  hitRate: number | null
  scored: number
  latestTarget: number | null
  latestAchievement: number | null
  targets: AnalystTargetPoint[]
  prices: AnalystPricePoint[]
  others: AnalystOverlaySeries[]
}

export interface AnalystDetailResponse {
  analystId: number
  name: string
  firm: string
  hitRate: number | null
  scored: number
  hits: number
  reportCount: number
  tickers: AnalystTickerSeries[]
}

// ── 종목 탭 (종목 → 예측 애널리스트 비교) ────────────────────────────────
export interface AnalystStockListItem {
  ticker: string
  businessName: string
  analystCount: number
  reportCount: number
  latestPrice: number | null // USD
  consensusTarget: number | null // USD, 애널별 최신 목표가 평균
  /**
   * 대표 섹터 — 종목 탭의 그룹 축. 매핑이 없으면 null(미분류로 묶인다).
   * `companyCount` 는 상세 페이지 존재 여부 판단용(3종목 미만이면 링크 금지).
   */
  sector: { sectorId: string; sectorName: string; companyCount: number } | null
}

export interface AnalystStockListResponse {
  stocks: AnalystStockListItem[]
}

/** 한 종목을 예측한 한 애널리스트의 목표가선(USD). */
export interface StockAnalystSeries {
  analystId: number
  name: string
  firm: string
  /** 예측력 점수 0~100 (Wilson 하한 — 적중률에 예측 횟수 반영). 채점 표본 0 → null. */
  score: number | null
  hitRate: number | null
  scored: number
  hits: number
  misses: number
  reportCount: number // 목표가 리포트 수
  latestTarget: number | null // USD
  points: { date: string; target: number }[] // USD
}

export interface AnalystStockDetailResponse {
  ticker: string
  businessName: string
  latestPrice: number | null // USD
  prices: AnalystPricePoint[] // USD
  analysts: StockAnalystSeries[]
}

// Score types
export interface ScoreSummary {
  total: number
  scale: number
  growth: number
  profitability: number
  sentiment: number
  dataQuality: number
}

/**
 * 애널리스트 투자의견 분포 한 기간(Yahoo recommendationTrend).
 * 인원수라 통화 변환 불요.
 */
export interface RecommendationTrendPoint {
  period: string // '0m'(이번 달) | '-1m' | '-2m' | '-3m'
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

export interface ScoreDetail extends ScoreSummary {
  revenueGrowth: number | null
  earningsGrowth: number | null
  operatingMargin: number | null
  returnOnEquity: number | null
  recommendationKey: string | null
  analystCount: number | null
  targetMeanPrice: number | null
  // 08_stock_insights 가산 확장 (전부 옵셔널/nullable → 구버전 소비자 무손상)
  beta?: number | null // 무차원
  debtToEquity?: number | null // 무차원
  freeCashflow?: number | null // toUsd 변환 필수
}

export interface SectorCompanyWithDetails {
  sectorId: string
  ticker: string
  rank: number
  notes: string | null
  company: {
    ticker: string
    name: string
    nameKo: string | null
    logoUrl: string | null
  }
  snapshot: {
    date: string
    marketCap: number | null
    price: number | null
    priceChange: number | null
  } | null
  score: ScoreSummary | null
  // For historical comparison
  currentSnapshot?: {
    price: number | null
    priceChange: number | null
  } | null
  priceChangeFromSnapshot?: number | null
}

export interface MapResponse {
  categories: {
    id: string
    name: string
    nameEn: string | null
    order: number
  }[]
  sectors: {
    id: string
    categoryId: string | null
    name: string
    nameEn: string | null
    order: number
    description: string | null
  }[]
  sectorCompanies: SectorCompanyWithDetails[]
  lastUpdated: string | null
  selectedDate: string | null
  availableDates: string[]
  isHistorical: boolean
  appliedRegion?: _RegionFilter
}

export interface PriceHistory {
  date: string
  price: number
  volume: number
}

export interface CompanyDetailResponse {
  company: {
    ticker: string
    name: string
    nameKo: string | null
    logoUrl: string | null
  }
  profile: {
    sector: string | null
    industry: string | null
    country: string | null
    employees: number | null
    revenue: number | null
    netIncome: number | null
    description: string | null
    website: string | null
  } | null
  /** 사람이 쓴 한 줄 설명. 없으면 null(화면은 섹터명으로 폴백). */
  summaryKo?: string | null
  /** 업종 원문(영문). 업종 아이콘을 고르는 데만 쓴다 — 문자열은 표시하지 않는다. */
  industry?: string | null
  snapshot: {
    /** 데이터 기준일 `YYYY-MM-DD` — 화면의 `<DataAsOf>` 가 표기한다. */
    date: string
    marketCap: number | null
    price: number | null
    priceChange: number | null
    week52High: number | null
    week52Low: number | null
    volume: number | null
    peRatio: number | null
    pegRatio: number | null
    // 08_stock_insights 가산 확장 (옵셔널)
    week52Position?: number | null // (price-low)/(high-low), 0~1. 동일 ticker 비율 → 변환 불요
    dayHigh?: number | null // toUsd
    dayLow?: number | null // toUsd
    avgVolume?: number | null // 무차원
  } | null
  history: PriceHistory[]
  score: ScoreDetail | null
  sectors: {
    sector: {
      id: string
      name: string
      nameEn: string | null
    }
    rank: number
  }[]
  // 08_stock_insights 가산 확장 (옵셔널 → 모달 무손상)
  analystUpside?: {
    targetMeanPriceUsd: number | null
    currentPriceUsd: number | null
    upsidePct: number | null // (target-current)/current, 둘 다 USD 환산 후 계산
  } | null
  dominance?: {
    sectorCount: number // 소속 섹터 수
    topRankCount: number // rank===1 인 섹터 수
    bestRank: number | null // min(rank)
  } | null
  // 12_dcf_score 가산 확장 (옵셔널 → 모달 무손상). 랭킹과 동일 lib/dcf 엔진 산출.
  dcf?: {
    score: number | null // 0~100
    upsidePct: number | null // (내재가치-현재가)/현재가, 비율(소수)
    intrinsicUsd: number | null // 주당 내재가치(USD)
    available: boolean
    reason: string | null // 'finance'|'negativeFcf'|'missing'|'lowConfidence'|null
    discountRate: number | null // 도출된 할인율 r
    // 연도별 예측 현금흐름(기업 전체 FCF·USD 환산). 제외 시 null. (#24)
    projections: { year: number; fcf: number; pv: number }[] | null
    terminalPv: number | null // 잔존가치(TV) 현재가치(USD)
  } | null
  /**
   * issue#33 애널리스트 의견 분포 추이 (옵셔널 → 구버전/미수집 DB 무손상).
   * 최신순 정렬. 수집 전이거나 커버리지가 없으면 빈 배열.
   */
  recommendationTrend?: RecommendationTrendPoint[]
}

export interface SectorDetailResponse {
  sector: {
    id: string
    categoryId: string | null
    name: string
    nameEn: string | null
    order: number
    description: string | null
  }
  category: {
    id: string
    name: string
    nameEn: string | null
  } | null
  companies: SectorCompanyWithDetails[]
  marketCapTotal: number
}

// Company Insights API Types (08_stock_insights — /api/company/[ticker]/insights)
export interface ScoreHistoryPoint {
  date: string
  total: number // smoothed_score
  raw: number // raw_total_score
  scale: number
  growth: number
  profitability: number
  sentiment: number
}

export interface ScoreMomentum {
  deltaTotal: number | null // 최신 - range시작
  deltaPct: number | null
  trend: 'up' | 'down' | 'flat'
}

export interface InsightPeer {
  ticker: string
  name: string
  nameKo: string | null
  rank: number
  isSelf: boolean
  marketCapUsd: number | null // toUsd 후
  score: number | null // smoothed_score (무차원)
}

export interface InsightSectorContext {
  sectorId: string
  sectorName: string
  peerCount: number
  marketCapTotalUsd: number // toUsd 후 합산
  marketSharePct: number | null // self / total (둘 다 USD)
  medianScore: number | null
  medianMarketCapUsd: number | null
}

export interface ValuationMetric {
  value: number | null
  percentile: number | null // 0~100, min-peer<4 시 null
  median: number | null
}

export interface InsightValuation {
  peRatio: ValuationMetric
  pegRatio: ValuationMetric
  returnOnEquity: ValuationMetric
  priceToBook: ValuationMetric
  evToEbitda: ValuationMetric
}

export interface PeBandPoint {
  date: string
  pe: number
}

/**
 * PER 밴드 — 종목 자체 PER 이력 대비 현재 위치.
 * low/high 는 25/75 백분위(정상 밴드), percentile 은 current 의 이력 내 위치(0~100).
 */
export interface PeBand {
  history: PeBandPoint[]
  min: number
  low: number
  median: number
  high: number
  max: number
  current: number
  percentile: number
}

export interface KeyValuationMetric {
  key: 'peRatio' | 'priceToBook' | 'evToEbitda'
  label: string
  reason: string
  companion: string
}

export interface CompanyInsightsResponse {
  primarySectorId: string | null
  allSectorIds: string[]
  scoreHistory: ScoreHistoryPoint[]
  scoreMomentum: ScoreMomentum | null
  peers: InsightPeer[]
  sectorContext: InsightSectorContext | null
  valuation: InsightValuation | null
  peBand: PeBand | null
  keyValuationMetric: KeyValuationMetric | null
  /** peer 표본이 min-peer(N≥4) 미만이면 true → median/percentile null */
  insufficientPeerSample: boolean
  appliedRange: number // 실제 적용된 일수
}

// Statistics API Types
export interface TrendDataPoint {
  date: string
  marketCap: number
}

export interface TrendItem {
  id: string
  name: string
  nameKo?: string | null
  data: TrendDataPoint[]
}

export interface TrendResponse {
  items: TrendItem[]
  dateRange: {
    start: string
    end: string
  }
  appliedRegion?: _RegionFilter
}

export interface CompanySectorInfo {
  id: string
  name: string
  rank: number
}

export interface CompanyStatItem {
  ticker: string
  name: string
  nameKo: string | null
  count: number
  sectors: CompanySectorInfo[]
  latestSnapshot: {
    marketCap: number | null
    price: number | null
    priceChange: number | null
  } | null
}

export interface CompanyStatisticsResponse {
  companies: CompanyStatItem[]
  total: number
  page: number
  totalPages: number
  appliedRegion?: _RegionFilter
}

export interface CategoryMarketCap {
  id: string
  name: string
  nameEn: string | null
  marketCap: number
  sectorCount: number
}

export interface SectorGrowth {
  id: string
  name: string
  nameEn: string | null
  categoryId: string | null
  startMarketCap: number
  endMarketCap: number
  growthRate: number
}

// Market Size API Types (시장 규모 시각화 — /market-size)
/** 매출 커버리지 (합산에 실제 반영된 종목 / 전체 추적 종목) */
export interface RevenueCoverage {
  withRevenue: number
  total: number
}

/** 카테고리 또는 섹터 단위의 시장 규모 집계 노드. 모든 가격성 값은 USD. */
export interface MarketSizeNode {
  id: string
  name: string
  /** 시총 합 (USD, toUsd 후 집계) */
  marketCap: number
  /** 시총 가중 매출 성장률 (소수, 예: 0.16 = 16%). 데이터 없으면 null */
  revenueGrowth: number | null
  /** 시총 가중 목표주가 상승여력 (소수). 데이터 없으면 null */
  targetUpside: number | null
  /** 매출 합 (USD). 커버리지 0 이면 null */
  revenueSum: number | null
  revenueCoverage: RevenueCoverage
  tickerCount: number
}

export interface MarketSizeCategory extends MarketSizeNode {
  /** 대표 산업(첫 매핑) — 버블 색 그룹핑용. 미매핑 시 null */
  industryId: string | null
  industryName: string | null
  /** 드릴다운용 섹터 노드 */
  sectors: MarketSizeNode[]
}

export interface MarketSizeResponse {
  categories: MarketSizeCategory[]
  /** 집계 기준 거래일 */
  date: string | null
  appliedRegion: _RegionFilter
  appliedIndustryId: string | null
  /** 표시된 카테고리 시총 총합 (USD) */
  totalMarketCap: number
}

// Price Changes API Types
export interface PriceChangeItem {
  ticker: string
  name: string
  nameKo: string | null
  firstPrice: number | null
  firstDate: string
  latestPrice: number | null
  latestDate: string
  /** 첫날→마지막날 가격의 USD 절댓값 차이(달러 차액). %가 아님. daily_snapshots.price_change(%)와 다름. */
  priceChangeAbs: number | null
  percentChange: number | null
  marketCap: number | null
}

export interface PriceChangesResponse {
  companies: PriceChangeItem[]
  dateRange: {
    start: string
    end: string
  }
  total: number
  appliedRegion?: _RegionFilter
}

// Sector Trend API Types
export interface SectorTrendPeriod {
  period: number
  flowPercent: number
  flowAmount: number
  startMarketCap: number
  endMarketCap: number
}

export interface SectorTrendData {
  id: string
  name: string
  nameEn: string | null
  periods: SectorTrendPeriod[]
}

export interface SectorTrendResponse {
  sectors: SectorTrendData[]
  dateRange: { start: string; end: string }
  appliedRegion?: _RegionFilter
}

// Money Flow API Types
export interface MoneyFlowTrendPoint {
  date: string
  mfi: number | null
  flowAmount: number
  marketCap: number
}

export interface SectorMoneyFlow {
  id: string
  name: string
  nameEn: string | null
  mfi: number | null // Money Flow Index (0-100)
  flowDirection: 'in' | 'out' // 유입/유출
  flowAmount: number // 자금 흐름 금액 (시가총액 변화)
  flowPercent: number // 변화율 %
  startMarketCap: number
  endMarketCap: number
  companyCount: number
  trend: MoneyFlowTrendPoint[]
}

export interface SectorCompanyPriceData {
  ticker: string
  name: string
  nameKo: string | null
  rank: number
  startPrice: number | null
  endPrice: number | null
  priceChangePercent: number | null
  marketCap: number | null
  priceHistory: PriceHistory[]
}

export interface SectorCompaniesResponse {
  sectorId: string
  sectorName: string
  period: number
  dateRange: { start: string; end: string }
  companies: SectorCompanyPriceData[]
  appliedRegion?: _RegionFilter
}

export interface MoneyFlowResponse {
  period: number
  date: string
  flows: SectorMoneyFlow[]
  totalInflow: number
  totalOutflow: number
  netFlow: number
  dateRange: {
    start: string
    end: string
  }
  appliedRegion?: _RegionFilter
}

// Search types
export interface SearchResultItem {
  ticker: string
  name: string
  nameKo: string | null
  price: number | null
  priceChange: number | null
  marketCap: number | null
  /** 사람이 쓴 한 줄 설명. 없으면 null(그 줄을 렌더하지 않는다). */
  summaryKo: string | null
  /** 업종 원문(영문). 업종 아이콘을 고르는 데만 쓴다 — 문자열은 표시하지 않는다. */
  industry: string | null
}

export interface SearchResponse {
  results: SearchResultItem[]
  query: string
  total: number
}

// Industry types
export interface IndustryOverview {
  id: string
  name: string
  nameEn: string | null
  icon: string | null
  categoryCount: number
  sectorCount: number
  companyCount: number
  totalMarketCap: number
  marketCapChange: number
  /** 최근 14일 시가총액 시계열 (오래된 → 최신). 데이터 부족 시 짧을 수 있음. */
  marketCapHistory?: number[]
  /** 14일 자금 유입(시총 변화)이 가장 큰 섹터 */
  topSectorByFlow?: {
    id: string
    name: string
    flowAmount: number
  } | null
  /** 14일 시총 변화율이 가장 큰 회사 */
  topCompanyByChange?: {
    ticker: string
    name: string
    nameKo: string | null
    changePercent: number
  } | null
}

/**
 * 추적 종목 전체(중복 제거) 시장 집계.
 * 산업별 `totalMarketCap` 단순 합산은 멀티산업 종목을 중복 계산(현재 약 3.4배)하므로,
 * distinct 종목 기준으로 별도 집계한 값. "전체 시장"이 아니라 "추적 종목" 범위다.
 */
export interface MarketAggregate {
  /** 추적 종목(중복 제거) 합산 시가총액 (USD, 최신일) */
  marketCapTotal: number
  /** 전일 대비 시가총액 변화율 (%) */
  marketCapChange: number
  /** 최근 14일 시가총액 시계열 (오래된 → 최신, USD) */
  marketCapHistory: number[]
  /** 합산에 포함된 추적 종목 수 */
  tickerCount: number
}

export interface IndustriesResponse {
  industries: IndustryOverview[]
  /** 추적 종목 전체(중복 제거) 집계. 구버전 캐시 호환을 위해 옵셔널. */
  market?: MarketAggregate
  lastUpdated: string | null
  appliedRegion?: _RegionFilter
}

/** 추적 종목 시총 일자별 추이 1포인트. */
export interface MarketCapHistoryPoint {
  date: string
  /** 해당일 추적 종목(중복 제거) 합산 시가총액 (USD) */
  marketCapUsd: number
  /** 전일 대비 변화율 (%). 직전 거래일 데이터 없으면 null. */
  changePct: number | null
}

export interface MarketCapHistoryResponse {
  /** 오래된 → 최신 순 일자별 추이 */
  history: MarketCapHistoryPoint[]
  /** 합산에 포함된 추적 종목 수 */
  tickerCount: number
  appliedRegion?: _RegionFilter
}

export interface IndustryFilterResult {
  categoryIds: string[]
  sectorIds: string[]
  tickers: string[]
}

/** 월간 리포트 일별 시장 흐름 한 점(#28). */
export interface DailyMarketPoint {
  date: string
  /** 기간 시작 대비 누적 % 변화. */
  pct: number
  /** 전일 대비 % 변화. 첫날은 null. */
  dayPct: number | null
}

/** 급등/급락일 + 그날 리포트 요약(인라인 노출용). */
export interface DailyMarketMover {
  date: string
  /** 기간 시작 대비 누적 %(그래프 y 위치). */
  pct: number
  /** 전일 대비 % 변화. */
  dayPct: number
  /** 그날 발행된 데일리 리포트 id(상세 이동용). */
  newsId: string | null
  newsTitle: string | null
  /** 한 줄 결론(one_line_conclusion). */
  oneLine: string | null
  /** 전문가 30초 브리핑 요약(thirtySecBrief, 수집방법 마커 제거). */
  brief: string | null
}

export interface DailyMarketResponse {
  points: DailyMarketPoint[]
  /** 기간 내 전일대비 최대 상승일(요약 포함). */
  spike: DailyMarketMover | null
  /** 기간 내 전일대비 최대 하락일(요약 포함). */
  drop: DailyMarketMover | null
}

// Industry Money Flow Summary types
export interface IndustryMoneyFlowSummary {
  industryId: string
  industryName: string
  industryNameEn: string | null
  industryIcon: string | null
  totalInflow: number
  totalOutflow: number
  netFlow: number
  netFlowPercent: number
  flowDirection: 'in' | 'out'
  /**
   * 기간 내 일별 누적 순유입액(USD). dateRange.start 를 0 으로 잡은 시계열이라
   * 마지막 값 === netFlow. 카드 배경 그래프용이라 날짜는 싣지 않는다
   * (x 축은 dateRange 로 이미 표기됨).
   */
  trend: number[]
}

export interface IndustryMoneyFlowResponse {
  industries: IndustryMoneyFlowSummary[]
  period: number
  dateRange: { start: string; end: string }
  /** trend 배열의 x 축. 산업마다 같은 날짜열이라 응답에 한 번만 싣는다. */
  dates: string[]
  appliedRegion?: _RegionFilter
}

// ── 경제 캘린더 (14_econ_calendar) ─────────────────────────────
// 필터 유니온 (UI/쿼리 값). SoT: lib/econ-calendar.ts (Phase C)
export type CalendarCountry = 'all' | 'kr' | 'us'
export type CalendarCategory = 'all' | 'indicator' | 'ipo' | 'earnings'

// DB 컬럼 값 (economic_events.country / .category)
export type CalendarCountryValue = 'KR' | 'US'
export type CalendarCategoryValue = 'indicator' | 'ipo' | 'earnings'
// 'ipo' 는 SQLite ipo_calendar 파생값 — economic_events 컬럼에는 없다.

/** 중요도 3단계 (별점/색상 매핑용) */
export type EconomicImportance = 'low' | 'medium' | 'high'

/** 단일 경제 이벤트 (API DTO). 값은 통화 무관 문자열 원문 */
export interface EconomicEvent {
  id: string
  country: CalendarCountryValue // 'KR' | 'US'
  category: CalendarCategoryValue // 소스가 다르다: indicator=Supabase, ipo/earnings=SQLite
  title: string // 예: "미국 소비자물가지수(CPI)"
  titleEn: string | null
  /** 'YYYY-MM-DD' (KST) — 그리드 range 축 & 그룹핑 키 */
  dateKst: string
  /** 'HH:mm' (KST). 시간 미정/종일이면 null */
  time: string | null
  importance: EconomicImportance
  actual: string | null // 발표 전 null (예 "3.2%")
  forecast: string | null // 컨센서스 (예 "3.1%")
  previous: string | null // 직전치
  unit: string | null // 단위 라벨(값에 포함돼 있으면 null)
  source: string | null // 출처 표기(선택)
  sourceUrl: string | null // 출처 원문 URL(선택). 있으면 이벤트 항목이 링크가 됨
}

/** GET /api/economic-calendar 응답 data */
export interface EconomicCalendarResponse {
  events: EconomicEvent[] // flat, dateKst asc → time asc 정렬
  range: { from: string; to: string } // 실제 적용 범위(클램프 반영)
  appliedCountry: CalendarCountry
  appliedCategory: CalendarCategory
  clamped: boolean // range 상한(62일) 초과로 축소됐는지
}
