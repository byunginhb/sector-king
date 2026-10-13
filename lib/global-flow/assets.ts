/**
 * 글로벌 자금 지도 — 추적 자산군 정의 (SoT).
 *
 * symbol 은 scripts/update_global_flow.py 의 ASSET_SYMBOLS 와 일치해야 한다.
 * 규모(size) 는 "자산군 전체 시가 가치"의 추정치다. 출처·기준일을 화면 설명 패널에
 * 그대로 노출하므로, 값을 바꾸면 source·asOf 도 같이 바꾼다.
 * 근거와 한계: docs/wiki/features/global-flow/data-sources.md
 */

export type AssetGroup = 'equity' | 'bond' | 'commodity' | 'crypto' | 'cash'
/** 위험 선호 판정용 분류. neutral 은 판정에서 빠진다. */
export type RiskSide = 'risk' | 'safe' | 'neutral'

export type SizeSpec =
  /** 기준일 시가 가치 × (현재가 / 기준일 가격). 주식·채권 */
  | {
      kind: 'anchor'
      value: number
      currency: 'USD' | 'KRW'
      date: string
      source: string
    }
  /** 수량 × 가격. 금(온스)·크립토(유통량) — seriesId 가 있으면 최신 수집값 우선 */
  | {
      kind: 'units'
      units: number
      seriesId?: string
      source: string
      asOf: string
    }
  /** 시계열 최신 잔고 × scale. 현금(MMF) */
  | { kind: 'level'; seriesId: string; scale: number; source: string }

export interface AssetDef {
  id: string
  symbol: string
  name: string
  group: AssetGroup
  risk: RiskSide
  /** KRW 자산은 원/달러로 나눠 USD 가격으로 환산한다. */
  currency: 'USD' | 'KRW'
  /** null = 시장 "가치"가 정의되지 않음(원유·구리) → 회전 궤적에만 등장 */
  size: SizeSpec | null
}

const TROY_OZ_PER_TONNE = 32_150.7466

export const ASSETS: readonly AssetDef[] = [
  {
    id: 'us_equity',
    symbol: '^GSPC',
    name: '미국 주식',
    group: 'equity',
    risk: 'risk',
    currency: 'USD',
    size: {
      kind: 'anchor',
      value: 49.8e12,
      currency: 'USD',
      date: '2024-12-31',
      source: 'S&P 500 시가총액 (S&P DJI, 2024년 말 근사치)',
    },
  },
  {
    id: 'kr_equity',
    symbol: '^KS11',
    name: '한국 주식',
    group: 'equity',
    risk: 'risk',
    currency: 'KRW',
    size: {
      kind: 'anchor',
      value: 1963e12,
      currency: 'KRW',
      date: '2024-12-30',
      source: '코스피 시가총액 (KRX, 2024년 말 근사치)',
    },
  },
  {
    id: 'world_equity',
    symbol: 'ACWX',
    name: '미국 외 세계 주식',
    group: 'equity',
    risk: 'risk',
    currency: 'USD',
    size: {
      kind: 'anchor',
      value: 25e12,
      currency: 'USD',
      date: '2024-12-31',
      source: 'MSCI ACWI ex USA 시가총액 (2024년 말 근사치)',
    },
  },
  {
    id: 'ust',
    symbol: 'IEF',
    name: '미국 국채',
    group: 'bond',
    risk: 'safe',
    currency: 'USD',
    size: {
      kind: 'anchor',
      value: 28.3e12,
      currency: 'USD',
      date: '2024-12-31',
      source: '미 재무부 시장성 국채 잔액 (2024년 말) · 가격은 7~10년물 ETF(IEF)',
    },
  },
  {
    id: 'ust_long',
    symbol: 'TLT',
    name: '미국 장기국채',
    group: 'bond',
    risk: 'safe',
    currency: 'USD',
    size: null,
  },
  {
    id: 'ig',
    symbol: 'LQD',
    name: '투자등급 회사채',
    group: 'bond',
    risk: 'neutral',
    currency: 'USD',
    size: {
      kind: 'anchor',
      value: 10e12,
      currency: 'USD',
      date: '2024-12-31',
      source: 'SIFMA 미국 회사채 잔액 중 투자등급 (2024년 말 근사치)',
    },
  },
  {
    id: 'hy',
    symbol: 'HYG',
    name: '하이일드 채권',
    group: 'bond',
    risk: 'risk',
    currency: 'USD',
    size: {
      kind: 'anchor',
      value: 1.4e12,
      currency: 'USD',
      date: '2024-12-31',
      source: 'SIFMA 미국 하이일드 회사채 잔액 (2024년 말 근사치)',
    },
  },
  {
    id: 'gold',
    symbol: 'GC=F',
    name: '금',
    group: 'commodity',
    risk: 'safe',
    currency: 'USD',
    size: {
      kind: 'units',
      units: 216_265 * TROY_OZ_PER_TONNE,
      source: 'World Gold Council 지상 재고 216,265톤 (2024년 말)',
      asOf: '2024-12-31',
    },
  },
  {
    id: 'oil',
    symbol: 'CL=F',
    name: '원유',
    group: 'commodity',
    risk: 'risk',
    currency: 'USD',
    size: null,
  },
  {
    id: 'copper',
    symbol: 'HG=F',
    name: '구리',
    group: 'commodity',
    risk: 'risk',
    currency: 'USD',
    size: null,
  },
  {
    id: 'btc',
    symbol: 'BTC-USD',
    name: '비트코인',
    group: 'crypto',
    risk: 'risk',
    currency: 'USD',
    size: {
      kind: 'units',
      units: 20_000_000,
      seriesId: 'BTC_SUPPLY',
      source: '유통량 × 가격 (Yahoo Finance)',
      asOf: '수집일',
    },
  },
  {
    id: 'eth',
    symbol: 'ETH-USD',
    name: '이더리움',
    group: 'crypto',
    risk: 'risk',
    currency: 'USD',
    size: {
      kind: 'units',
      units: 120_000_000,
      seriesId: 'ETH_SUPPLY',
      source: '유통량 × 가격 (Yahoo Finance)',
      asOf: '수집일',
    },
  },
  {
    id: 'cash',
    symbol: 'BIL',
    name: '현금 (MMF)',
    group: 'cash',
    risk: 'safe',
    currency: 'USD',
    size: {
      kind: 'level',
      seriesId: 'FRED:MMMFFAQ027S',
      scale: 1e6,
      source: '미국 MMF 총자산 (FRED MMMFFAQ027S, 분기) · 수익률은 T-bill ETF(BIL)',
    },
  },
] as const

export const GROUP_LABEL: Record<AssetGroup, string> = {
  equity: '주식',
  bond: '채권',
  commodity: '원자재',
  crypto: '크립토',
  cash: '현금',
}

/** 잣대 — 버킷이 아니다. 모든 값이 USD 표시라 달러를 합산하면 이중 계산이 된다. */
export const RULERS = {
  dxy: { symbol: 'DX-Y.NYB', name: '달러 인덱스' },
  usdkrw: { symbol: 'KRW=X', name: '원/달러' },
} as const

/** 주식 거래일 캘린더의 기준 — 기간 끝날짜·주간 샘플링이 이 심볼의 날짜를 따른다. */
export const CALENDAR_SYMBOL = '^GSPC'

/** ETF 순설정 추정 대상 → 귀속 자산군. update_global_flow.py ETF_SYMBOLS 와 일치. */
export const ETF_ASSET: Record<string, string> = {
  SPY: 'us_equity',
  EWY: 'kr_equity',
  ACWX: 'world_equity',
  IEF: 'ust',
  TLT: 'ust',
  LQD: 'ig',
  HYG: 'hy',
  GLD: 'gold',
  IAU: 'gold',
  IBIT: 'btc',
  BIL: 'cash',
}

export type Period = '1w' | '1m' | '3m' | '1y'
export const PERIODS: readonly Period[] = ['1w', '1m', '3m', '1y'] as const
export const PERIOD_DAYS: Record<Period, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 91,
  '1y': 365,
}
export const PERIOD_LABEL: Record<Period, string> = {
  '1w': '1주',
  '1m': '1개월',
  '3m': '3개월',
  '1y': '1년',
}
