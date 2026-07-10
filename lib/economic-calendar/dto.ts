/**
 * economic_events Supabase row ↔ 관리자 API DTO 변환 헬퍼.
 *
 * 공개 API(`app/api/economic-calendar`)의 `EconomicEvent` DTO 는 노출용 축소본이고,
 * 여기 `EconomicEventDTO` 는 어드민 편집에 필요한 전체 컬럼(source/external_id/
 * is_hidden/is_locked/감사 필드)을 camelCase 로 노출한다.
 * snake_case row → camelCase DTO 매핑만 담당(통화 변환 없음, 문자열 원문).
 */
import type {
  EconomicEventCountry,
  EconomicEventCategory,
  EconomicEventImportance,
} from '@/drizzle/supabase-schema'

/** 관리자 편집용 전체 DTO (camelCase) */
export interface EconomicEventDTO {
  id: string
  source: string
  externalId: string
  country: EconomicEventCountry
  category: EconomicEventCategory
  importance: EconomicEventImportance
  title: string
  titleEn: string | null
  /** 'YYYY-MM-DD' (KST) */
  eventDate: string
  /** 'HH:MM' (KST). null=종일/미정 */
  eventTime: string | null
  actual: string | null
  forecast: string | null
  previous: string | null
  unit: string | null
  sourceUrl: string | null
  relatedIndustryId: string | null
  isHidden: boolean
  isLocked: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/** 목록 아이템(경량) */
export interface EconomicEventListItem {
  id: string
  source: string
  country: EconomicEventCountry
  category: EconomicEventCategory
  importance: EconomicEventImportance
  title: string
  eventDate: string
  eventTime: string | null
  sourceUrl: string | null
  isHidden: boolean
  isLocked: boolean
  updatedAt: string
}

interface RawEconomicEventRow {
  id: number | string
  source: string
  external_id: string
  country: EconomicEventCountry
  category: EconomicEventCategory
  importance: EconomicEventImportance
  title: string
  title_en: string | null
  event_date: string
  event_time: string | null
  actual: string | null
  forecast: string | null
  previous: string | null
  unit: string | null
  source_url: string | null
  related_industry_id: string | null
  is_hidden: boolean
  is_locked: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RawEconomicEventListRow {
  id: number | string
  source: string
  country: EconomicEventCountry
  category: EconomicEventCategory
  importance: EconomicEventImportance
  title: string
  event_date: string
  event_time: string | null
  source_url: string | null
  is_hidden: boolean
  is_locked: boolean
  updated_at: string
}

export function rowToDto(row: RawEconomicEventRow): EconomicEventDTO {
  return {
    id: String(row.id),
    source: row.source,
    externalId: row.external_id,
    country: row.country,
    category: row.category,
    importance: row.importance,
    title: row.title,
    titleEn: row.title_en ?? null,
    eventDate: String(row.event_date).slice(0, 10),
    eventTime: row.event_time ? String(row.event_time).slice(0, 5) : null,
    actual: row.actual ?? null,
    forecast: row.forecast ?? null,
    previous: row.previous ?? null,
    unit: row.unit ?? null,
    sourceUrl: row.source_url ?? null,
    relatedIndustryId: row.related_industry_id ?? null,
    isHidden: Boolean(row.is_hidden),
    isLocked: Boolean(row.is_locked),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToListItem(
  row: RawEconomicEventListRow
): EconomicEventListItem {
  return {
    id: String(row.id),
    source: row.source,
    country: row.country,
    category: row.category,
    importance: row.importance,
    title: row.title,
    eventDate: String(row.event_date).slice(0, 10),
    eventTime: row.event_time ? String(row.event_time).slice(0, 5) : null,
    sourceUrl: row.source_url ?? null,
    isHidden: Boolean(row.is_hidden),
    isLocked: Boolean(row.is_locked),
    updatedAt: row.updated_at,
  }
}

export const EVENT_LIST_COLUMNS =
  'id, source, country, category, importance, title, event_date, event_time, source_url, is_hidden, is_locked, updated_at'

export const EVENT_FULL_COLUMNS =
  'id, source, external_id, country, category, importance, title, title_en, event_date, event_time, actual, forecast, previous, unit, source_url, related_industry_id, is_hidden, is_locked, created_by, created_at, updated_at'
