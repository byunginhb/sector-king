/**
 * Supabase row ↔ API DTO 매핑 (snake_case → camelCase).
 */
import type {
  WatchlistItemDTO,
  RecentlyViewedItemDTO,
  NoteDTO,
  EmailSubscriptionDTO,
  WatchlistItemType,
  PerkItemType,
} from '@/drizzle/supabase-schema'

interface RawWatchlistRow {
  id: string
  user_id: string
  item_type: string
  item_key: string
  display_name: string | null
  note: string | null
  pinned: boolean
  created_at: string
  updated_at: string
}

interface RawRecentlyViewedRow {
  id: string
  item_type: string
  item_key: string
  display_name: string | null
  viewed_at: string
}

interface RawNoteRow {
  id: string
  item_type: string
  item_key: string
  body: string
  created_at: string
  updated_at: string
}

interface RawEmailSubscriptionRow {
  user_id: string
  daily_report: boolean
  hour_kst: number
  last_sent_at: string | null
}

function toWatchType(s: string): WatchlistItemType {
  return s === 'sector' || s === 'industry' ? s : 'ticker'
}

function toPerkType(s: string): PerkItemType {
  if (s === 'sector' || s === 'industry' || s === 'news') return s
  return 'ticker'
}

export const WATCHLIST_COLUMNS =
  'id, user_id, item_type, item_key, display_name, note, pinned, created_at, updated_at'

export const RECENTLY_VIEWED_COLUMNS =
  'id, item_type, item_key, display_name, viewed_at'

export const NOTE_COLUMNS =
  'id, item_type, item_key, body, created_at, updated_at'

export const EMAIL_SUB_COLUMNS =
  'user_id, daily_report, hour_kst, last_sent_at'

export function rowToWatchlistDto(row: RawWatchlistRow): WatchlistItemDTO {
  return {
    id: row.id,
    itemType: toWatchType(row.item_type),
    itemKey: row.item_key,
    displayName: row.display_name,
    note: row.note,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToRecentlyViewedDto(
  row: RawRecentlyViewedRow
): RecentlyViewedItemDTO {
  return {
    id: row.id,
    itemType: toPerkType(row.item_type),
    itemKey: row.item_key,
    displayName: row.display_name,
    viewedAt: row.viewed_at,
  }
}

export function rowToNoteDto(row: RawNoteRow): NoteDTO {
  return {
    id: row.id,
    itemType: toPerkType(row.item_type),
    itemKey: row.item_key,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToEmailSubscriptionDto(
  row: RawEmailSubscriptionRow,
  emailEnabled: boolean
): EmailSubscriptionDTO {
  return {
    userId: row.user_id,
    dailyReport: row.daily_report,
    hourKst: row.hour_kst,
    lastSentAt: row.last_sent_at,
    emailEnabled,
  }
}

/** RESEND_API_KEY 등록 여부 — UI 활성/비활성 분기 */
export function isEmailFeatureEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
