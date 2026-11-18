import { NextResponse } from 'next/server'
import { requireUserApi } from '@/lib/auth/require-user-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyMatchRewards, getWeeklyMatchSeason } from '@/lib/weekly-match/rewards'
import { ENTRY_COLUMNS, ROUND_COLUMNS } from '@/lib/weekly-match/server'
import type { WeeklyMatchEntry, WeeklyMatchRound } from '@/lib/weekly-match/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
const pageSize = 200
const columns = `${ROUND_COLUMNS},weekly_match_settlements(version,outcome,left_return,right_return,reason,settled_at)`
interface RewardRoundRow {
  id: string
  title: string
  base_date: string
  end_date: string
  opens_at: string
  closes_at: string
  ends_at: string
  left_sector: WeeklyMatchRound['left']
  right_sector: WeeklyMatchRound['right']
  weekly_match_settlements: {
    version: number
    outcome: 'left' | 'right' | 'tie' | 'void' | 'pending'
    left_return: number | string | null
    right_return: number | string | null
    reason: string | null
    settled_at: string
  }[]
}

export async function GET() {
  try {
    const guard = await requireUserApi()
    if (!guard.ok) {
      Object.entries(headers).forEach(([key, value]) => guard.response.headers.set(key, value))
      return guard.response
    }
    // Entries are readable only through the authenticated client; the admin role has no entry SELECT grant.
    const supabase = await createClient()
    const { count, error: countError } = await supabase.from('weekly_match_entries').select('round_id', { count: 'exact', head: true }).eq('user_id', guard.profile.id)
    if (countError || count === null) throw new Error('ENTRY_COUNT_FAILED')
    const now = new Date()
    const season = getWeeklyMatchSeason(now)
    const [year, month] = season.split('-').map(Number)
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
    const admin = createAdminClient()
    const rounds: WeeklyMatchRound[] = []
    const entries: WeeklyMatchEntry[] = []
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await admin.from('weekly_match_rounds').select(columns)
        .gte('end_date', `${season}-01`).lt('end_date', nextMonth)
        .order('id', { ascending: true })
        .order('version', { referencedTable: 'weekly_match_settlements', ascending: false })
        .limit(1, { referencedTable: 'weekly_match_settlements' })
        .range(offset, offset + pageSize - 1)
      if (error || !data) throw new Error('ROUND_READ_FAILED')
      if (!data.length) break
      const page = data as RewardRoundRow[]
      const { data: ownEntries, error: entryError } = await supabase.from('weekly_match_entries').select(ENTRY_COLUMNS)
        .eq('user_id', guard.profile.id).in('round_id', page.map((round) => round.id))
        .order('round_id', { ascending: true }).range(0, pageSize - 1)
      if (entryError || !ownEntries) throw new Error('ENTRY_READ_FAILED')
      entries.push(...ownEntries.map((entry) => ({ roundId: entry.round_id, side: entry.side, updatedAt: entry.updated_at })))
      rounds.push(...page.map((round): WeeklyMatchRound => {
        const latest = round.weekly_match_settlements.reduce((newest, settlement) => !newest || settlement.version > newest.version ? settlement : newest, null as typeof round.weekly_match_settlements[number] | null)
        return {
          id: round.id, title: round.title, baseDate: round.base_date, endDate: round.end_date,
          opensAt: round.opens_at, closesAt: round.closes_at, endsAt: round.ends_at,
          left: round.left_sector, right: round.right_sector,
          settlement: latest && latest.outcome !== 'pending' ? {
            version: latest.version, outcome: latest.outcome,
            leftReturn: latest.left_return === null ? null : Number(latest.left_return),
            rightReturn: latest.right_return === null ? null : Number(latest.right_return),
            reason: latest.reason, settledAt: latest.settled_at,
          } : null,
        }
      }))
      if (data.length < pageSize) break
    }
    return NextResponse.json({ success: true, data: { rewards: calculateWeeklyMatchRewards(rounds, entries, count > 0 || entries.length > 0, now) } }, { headers })
  } catch {
    return NextResponse.json({ success: false, error: '내 매치 보상을 불러올 수 없습니다' }, { status: 503, headers })
  }
}
