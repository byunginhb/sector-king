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
  participantCount?: number
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

export interface WeeklyMatchResultCard {
  roundId: string
  title: string
  baseDate: string
  endDate: string
  sideName: string
  outcome: 'hit' | 'miss' | 'tie' | 'void'
  leftName: string
  rightName: string
  leftReturn: number | null
  rightReturn: number | null
  version: number
  settledAt: string
}

export interface WeeklyMatchRewards {
  season: string
  firstPick: boolean
  participations: number
  points: number
  wins: number
  losses: number
  excluded: number
  pending: number
  cards: WeeklyMatchResultCard[]
}

export interface WeeklyMatchPublicProfile {
  nickname: string
  isPublic: boolean
}

export interface WeeklyMatchRankingEntry {
  rank: number
  nickname: string
  points: number
  wins: number
  losses: number
  validEntries: number
}

export interface WeeklyMatchLeaderboard {
  season: string
  total: number
  entries: WeeklyMatchRankingEntry[]
}
