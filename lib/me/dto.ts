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

/**
 * 워치리스트 항목 → 상세 경로. 순수 함수(테스트 가능).
 *
 * @param linkableSectors 상세 페이지가 존재하는 섹터 id 집합. 미지정이면 섹터는
 *   링크하지 않는다 — 모르는 상태에서 링크를 거는 쪽이 404 를 만든다(fail-closed).
 */
export function watchlistHref(
  itemType: WatchlistItemType,
  itemKey: string,
  linkableSectors?: ReadonlySet<string>
): string | null {
  if (!itemKey) return null
  switch (itemType) {
    case 'ticker':
      return `/stock/${encodeURIComponent(itemKey)}`
    case 'industry':
      return `/${encodeURIComponent(itemKey)}`
    case 'sector':
      return linkableSectors?.has(itemKey)
        ? `/sectors/${encodeURIComponent(itemKey)}`
        : null
    default:
      return null
  }
}

export function rowToWatchlistDto(
  row: RawWatchlistRow,
  linkableSectors?: ReadonlySet<string>
): WatchlistItemDTO {
  const itemType = toWatchType(row.item_type)
  return {
    id: row.id,
    itemType,
    itemKey: row.item_key,
    href: watchlistHref(itemType, row.item_key, linkableSectors),
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
