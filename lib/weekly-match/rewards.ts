import type { WeeklyMatchEntry, WeeklyMatchRewards, WeeklyMatchRound } from './types'

export function getWeeklyMatchSeason(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7)
}

export function calculateWeeklyMatchRewards(
  rounds: WeeklyMatchRound[],
  entries: WeeklyMatchEntry[],
  firstPick: boolean,
  now = new Date(),
): WeeklyMatchRewards {
  const season = getWeeklyMatchSeason(now)
  const rewards: WeeklyMatchRewards = { season, firstPick, participations: 0, points: 0, wins: 0, losses: 0, excluded: 0, pending: 0, cards: [] }
  const ownEntries = new Map(entries.map((entry) => [entry.roundId, entry]))
  for (const round of rounds) {
    const entry = ownEntries.get(round.id)
    if (!entry || !round.endDate.startsWith(`${season}-`)) continue
    rewards.participations++
    const result = round.settlement
    if (!result) {
      rewards.pending++
      continue
    }
    const outcome = result.outcome === 'tie' || result.outcome === 'void'
      ? result.outcome
      : result.outcome === entry.side ? 'hit' : 'miss'
    if (outcome === 'hit') rewards.wins++
    else if (outcome === 'miss') rewards.losses++
    else rewards.excluded++
    rewards.cards.push({
      roundId: round.id,
      title: round.title,
      baseDate: round.baseDate,
      endDate: round.endDate,
      sideName: round[entry.side].name,
      outcome,
      leftName: round.left.name,
      rightName: round.right.name,
      leftReturn: result.leftReturn,
      rightReturn: result.rightReturn,
      version: result.version,
      settledAt: result.settledAt,
    })
  }
  rewards.points = rewards.wins
  return rewards
}
