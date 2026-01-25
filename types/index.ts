// Re-export Drizzle types
export type {
  Category,
  Sector,
  Company,
  SectorCompany,
  DailySnapshot,
  CompanyProfile,
} from '@/drizzle/schema'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
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
