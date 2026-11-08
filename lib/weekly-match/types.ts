export type WeeklyMatchSide = 'left' | 'right'

export interface WeeklyMatchSector {
  id: string
  name: string
  tickers: { ticker: string; name: string }[]
}

export interface WeeklyMatchRound {
  id: string
  title: string
  baseDate: string
  endDate: string
  opensAt: string
  closesAt: string
  endsAt: string
  left: WeeklyMatchSector
  right: WeeklyMatchSector
  settlement: {
    version: number
    outcome: WeeklyMatchSide | 'tie' | 'void'
    leftReturn: number | null
    rightReturn: number | null
    reason: string | null
    settledAt: string
  } | null
}

export interface WeeklyMatchEntry {
  roundId: string
  side: WeeklyMatchSide
  updatedAt: string
}
