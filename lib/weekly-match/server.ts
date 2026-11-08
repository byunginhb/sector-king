import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WeeklyMatchRound, WeeklyMatchSector } from './types'

export const ROUND_COLUMNS = 'id,title,base_date,end_date,opens_at,closes_at,ends_at,left_sector,right_sector'
export const SETTLEMENT_COLUMNS = 'round_id,version,outcome,left_return,right_return,reason,settled_at'
export const ENTRY_COLUMNS = 'round_id,side,updated_at'
const sectorDto = (sector: WeeklyMatchSector): WeeklyMatchSector => ({
  id: sector.id,
  name: sector.name,
  tickers: sector.tickers.map(({ ticker, name }) => ({ ticker, name })),
})

export async function getWeeklyMatchRounds(): Promise<WeeklyMatchRound[]> {
  const admin = createAdminClient()
  const { data: rounds, error } = await admin.from('weekly_match_rounds').select(ROUND_COLUMNS).order('closes_at', { ascending: false }).limit(12)
  if (error) throw new Error('ROUND_READ_FAILED')
  if (!rounds?.length) return []
  const { data: settlements, error: settlementError } = await admin.from('weekly_match_settlements').select(SETTLEMENT_COLUMNS).in('round_id', rounds.map((round) => round.id)).order('version', { ascending: false })
  if (settlementError) throw new Error('SETTLEMENT_READ_FAILED')
  return rounds.map((round) => {
    const result = settlements?.find((settlement) => settlement.round_id === round.id)
    return {
      id: round.id,
      title: round.title,
      baseDate: round.base_date,
      endDate: round.end_date,
      opensAt: round.opens_at,
      closesAt: round.closes_at,
      endsAt: round.ends_at,
      left: sectorDto(round.left_sector as WeeklyMatchSector),
      right: sectorDto(round.right_sector as WeeklyMatchSector),
      settlement: result && result.outcome !== 'pending' ? {
        version: result.version,
        outcome: result.outcome,
        leftReturn: result.left_return === null ? null : Number(result.left_return),
        rightReturn: result.right_return === null ? null : Number(result.right_return),
        reason: result.reason,
        settledAt: result.settled_at,
      } : null,
    }
  })
}
