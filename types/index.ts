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

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
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

export interface ScoreDetail extends ScoreSummary {
  revenueGrowth: number | null
  earningsGrowth: number | null
  operatingMargin: number | null
  returnOnEquity: number | null
  recommendationKey: string | null
  analystCount: number | null
  targetMeanPrice: number | null
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
  snapshot: {
    marketCap: number | null
    price: number | null
    priceChange: number | null
    week52High: number | null
    week52Low: number | null
    volume: number | null
    peRatio: number | null
    pegRatio: number | null
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

// Price Changes API Types
export interface PriceChangeItem {
  ticker: string
  name: string
  nameKo: string | null
  firstPrice: number | null
  firstDate: string
  latestPrice: number | null
  latestDate: string
  priceChange: number | null
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
}

// Search types
export interface SearchResultItem {
  ticker: string
  name: string
  nameKo: string | null
  price: number | null
  priceChange: number | null
  marketCap: number | null
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
}

export interface IndustriesResponse {
  industries: IndustryOverview[]
  lastUpdated: string | null
}

export interface IndustryFilterResult {
  categoryIds: string[]
  sectorIds: string[]
  tickers: string[]
}
