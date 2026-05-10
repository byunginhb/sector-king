/**
 * Supabase Postgres Drizzle 스키마
 *
 * 기존 SQLite (`drizzle/schema.ts`)와 별도 운영. Phase A에서는 인증·뉴스만
 * Postgres로, 산업/티커 데이터는 SQLite 유지(저장소 분리).
 *
 * 마이그레이션 SoT는 `supabase/migrations/*.sql` (사용자가 Supabase
 * Dashboard에서 직접 실행). 본 파일은 타입/쿼리 빌더용 어노테이션.
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
  date,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'

/**
 * profiles — auth.users와 1:1 매핑되는 사용자 프로필.
 *
 * - `id` 는 `auth.users.id` 와 동일 (FK는 Postgres SQL에서 정의).
 * - `role` 은 `'user' | 'admin'` CHECK constraint (SQL 측 정의).
 * - `role` 자가승격은 BEFORE UPDATE 트리거(`prevent_role_self_escalation`)로 차단.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_profiles_role').on(table.role)]
)

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type UserRole = 'user' | 'admin'

// ----------------------------------------------------------------------------
// news_reports — 일별 마켓 리포트
// ----------------------------------------------------------------------------

export type ReportStatus = 'draft' | 'published' | 'archived'
export type ScenarioKind = 'bear' | 'base' | 'bull'
export type KoreanStockOpinion =
  | 'buy'
  | 'buy_selective'
  | 'neutral'
  | 'reduce'
export type NoviceStockBucket = 'will_rise' | 'will_fall' | 'buy_on_dip'
export type NoviceStockAction =
  | '사'
  | '조심하면서 사'
  | '지켜봐'
  | '안 사'

export interface TickerRef {
  symbol: string
  exchange?: string
  name?: string
  industryId?: string
}

export interface HeadlineItem {
  index: number
  category: string
  title: string
  tickers: TickerRef[]
  core: string
  point: string
  keywords: string[]
}

export interface ThemeFlowItem {
  index: number
  title: string
  evidence: string
  interpretation: string
  nextCheckpoint: string
}

export interface ActionIdeaItem {
  label: 'watchlist' | 'report' | 'risk' | 'sector' | 'dividend'
  body: string
  tickers?: TickerRef[]
}

export interface ScenarioItem {
  kind: ScenarioKind
  body: string
  trigger: string
}

export interface SectorFlow {
  name: string
  ytdPct?: number
  note: string
}

export interface FundFlowMap {
  outflows: SectorFlow[]
  inflows: SectorFlow[]
  driver: string
}

export interface KoreanStockItem {
  index: number
  name: string
  code: string
  opinion: KoreanStockOpinion
  rationale: string
  risk: string
  comment: string
}

export interface ExpertView {
  thirtySecBrief: string
  headlines: HeadlineItem[]
  themeFlows: ThemeFlowItem[]
  actions: ActionIdeaItem[]
  scenarios: {
    bear: ScenarioItem
    base: ScenarioItem
    bull: ScenarioItem
  }
  oneLiner: string
  fundFlow: FundFlowMap
  koreanStocks: KoreanStockItem[]
}

export interface NoviceEventItem {
  index: number
  title: string
  body: string
}

export interface NoviceStockRow {
  ticker: TickerRef
  reason: string
}

export interface NoviceStockTable {
  bucket: NoviceStockBucket
  rows: NoviceStockRow[]
}

export interface NoviceKoreanStockItem {
  index: number
  name: string
  code: string
  action: NoviceStockAction
  body: string
}

export interface NoviceView {
  oneLineSummary: string
  events: NoviceEventItem[]
  stockTables: NoviceStockTable[]
  koreanStocks: NoviceKoreanStockItem[]
  closing: string
}

export const newsReports = pgTable(
  'news_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    reportDate: date('report_date').notNull(),
    oneLineConclusion: text('one_line_conclusion'),
    coverKeywords: text('cover_keywords').array().notNull().default([]),
    expertView: jsonb('expert_view').$type<ExpertView>().notNull().default({} as ExpertView),
    noviceView: jsonb('novice_view').$type<NoviceView>().notNull().default({} as NoviceView),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_news_reports_status_published_at').on(table.status, table.publishedAt),
    index('idx_news_reports_report_date').on(table.reportDate),
  ]
)

export type NewsReport = typeof newsReports.$inferSelect
export type NewNewsReport = typeof newsReports.$inferInsert

/** API 응답용 정규화 타입 (snake_case → camelCase) */
export interface NewsReportDTO {
  id: string
  title: string
  status: ReportStatus
  publishedAt: string | null
  reportDate: string
  oneLineConclusion: string | null
  coverKeywords: string[]
  expertView: ExpertView
  noviceView: NoviceView
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/** 목록 카드용 (본문 제외) */
export interface NewsReportListItem {
  id: string
  title: string
  status: ReportStatus
  publishedAt: string | null
  reportDate: string
  oneLineConclusion: string | null
  coverKeywords: string[]
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------------------
// Phase B1 — 로그인 유저 혜택 (User Perks)
// ----------------------------------------------------------------------------

/** 모든 perks 테이블에서 공유하는 entity 종류 */
export type PerkItemType = 'ticker' | 'sector' | 'industry' | 'news'
export type WatchlistItemType = 'ticker' | 'sector' | 'industry'

/** watchlist — 통합 워치리스트 (ticker/sector/industry) */
export const watchlist = pgTable(
  'watchlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    itemType: text('item_type').notNull(),
    itemKey: text('item_key').notNull(),
    displayName: text('display_name'),
    note: text('note'),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_watchlist_user_created').on(table.userId, table.createdAt),
    index('idx_watchlist_user_type').on(table.userId, table.itemType),
  ]
)

export type WatchlistRow = typeof watchlist.$inferSelect
export type NewWatchlistRow = typeof watchlist.$inferInsert

/** recently_viewed — 최근 본 종목 (사용자당 50개, 트리거가 prune) */
export const recentlyViewed = pgTable(
  'recently_viewed',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    itemType: text('item_type').notNull(),
    itemKey: text('item_key').notNull(),
    displayName: text('display_name'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_recently_viewed_user_viewed').on(table.userId, table.viewedAt),
  ]
)

export type RecentlyViewedRow = typeof recentlyViewed.$inferSelect

/** notes — 마크다운 메모 (본인만, 10,000자 제한) */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    itemType: text('item_type').notNull(),
    itemKey: text('item_key').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notes_user_entity').on(table.userId, table.itemType, table.itemKey),
    index('idx_notes_user_created').on(table.userId, table.createdAt),
  ]
)

export type NoteRow = typeof notes.$inferSelect
export type NewNoteRow = typeof notes.$inferInsert

/** email_subscriptions — 일별 마켓 리포트 구독 (user 1행) */
export const emailSubscriptions = pgTable('email_subscriptions', {
  userId: uuid('user_id').primaryKey(),
  dailyReport: boolean('daily_report').notNull().default(false),
  hourKst: integer('hour_kst').notNull().default(8),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
  /** 1-click unsubscribe 토큰 (RFC 8058 List-Unsubscribe-Post 용) */
  unsubscribeToken: uuid('unsubscribe_token').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type EmailSubscriptionRow = typeof emailSubscriptions.$inferSelect

/** email_log — 발송 이력 (service_role write, self read) */
export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    kind: text('kind').notNull(),
    subject: text('subject').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('sent'),
    error: text('error'),
  },
  (table) => [
    index('idx_email_log_user_sent').on(table.userId, table.sentAt),
    index('idx_email_log_kind_sent').on(table.kind, table.sentAt),
  ]
)

export type EmailLogRow = typeof emailLog.$inferSelect

/** activity_log — 사용자 활동 (분석용) */
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    action: text('action').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_activity_user_created').on(table.userId, table.createdAt),
    index('idx_activity_action_created').on(table.action, table.createdAt),
  ]
)

export type ActivityLogRow = typeof activityLog.$inferSelect

/** contact_submissions — 문의/제보 (anon + auth INSERT 가능) */
export type ContactCategory = 'inquiry' | 'report' | 'bug' | 'feature' | 'other'
export type ContactStatus = 'open' | 'replied' | 'closed'

export const contactSubmissions = pgTable(
  'contact_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    email: text('email').notNull(),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    status: text('status').notNull().default('open'),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_contact_submissions_status_created').on(
      table.status,
      table.createdAt
    ),
    index('idx_contact_submissions_user_created').on(
      table.userId,
      table.createdAt
    ),
  ]
)

export type ContactSubmissionRow = typeof contactSubmissions.$inferSelect
export type NewContactSubmissionRow = typeof contactSubmissions.$inferInsert

// API 응답 DTO ----------------------------------------------------------------
export interface WatchlistItemDTO {
  id: string
  itemType: WatchlistItemType
  itemKey: string
  displayName: string | null
  note: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface RecentlyViewedItemDTO {
  id: string
  itemType: PerkItemType
  itemKey: string
  displayName: string | null
  viewedAt: string
}

export interface NoteDTO {
  id: string
  itemType: PerkItemType
  itemKey: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface EmailSubscriptionDTO {
  userId: string
  dailyReport: boolean
  hourKst: number
  lastSentAt: string | null
  /** RESEND_API_KEY 등록 여부 (서버에서만 결정 → 클라이언트 UI 분기용) */
  emailEnabled: boolean
}

export interface MyWatchPnlItem {
  ticker: string
  displayName: string | null
  marketCap: number | null
  price: number | null
  priceChange: number | null
}

export interface MySummaryDTO {
  watchCount: number
  noteCount: number
  recentlyViewedCount: number
  topGainers: MyWatchPnlItem[]
  topLosers: MyWatchPnlItem[]
  /** 워치 종목 평균 변동률 (%) */
  averageChange: number | null
}
