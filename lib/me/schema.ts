/**
 * Phase B1 user perks zod 스키마.
 *
 * - API 라우트 입력 검증 (POST/PATCH/DELETE)
 * - 클라이언트 mutation 페이로드와 1:1 매칭
 */
import { z } from 'zod'

// ----------------------------------------------------------------------------
// 공용
// ----------------------------------------------------------------------------
export const watchlistItemTypeSchema = z.enum(['ticker', 'sector', 'industry'])
export const perkItemTypeSchema = z.enum([
  'ticker',
  'sector',
  'industry',
  'news',
])

const itemKeySchema = z.string().trim().min(1).max(120)
const displayNameSchema = z.string().trim().max(200).nullable().optional()

// ----------------------------------------------------------------------------
// watchlist
// ----------------------------------------------------------------------------
export const watchlistAddSchema = z
  .object({
    itemType: watchlistItemTypeSchema,
    itemKey: itemKeySchema,
    displayName: displayNameSchema,
    note: z.string().max(500).nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .strict()

export type WatchlistAddInput = z.infer<typeof watchlistAddSchema>

export const watchlistFilterSchema = z
  .object({
    itemType: watchlistItemTypeSchema.optional(),
  })
  .strict()

// ----------------------------------------------------------------------------
// recently_viewed
// ----------------------------------------------------------------------------
export const recentlyViewedTrackSchema = z
  .object({
    itemType: perkItemTypeSchema,
    itemKey: itemKeySchema,
    displayName: displayNameSchema,
  })
  .strict()

export type RecentlyViewedTrackInput = z.infer<
  typeof recentlyViewedTrackSchema
>

// ----------------------------------------------------------------------------
// notes
// ----------------------------------------------------------------------------
export const noteUpsertSchema = z
  .object({
    itemType: perkItemTypeSchema,
    itemKey: itemKeySchema,
    body: z.string().min(1).max(10000),
  })
  .strict()

export type NoteUpsertInput = z.infer<typeof noteUpsertSchema>

export const notesFilterSchema = z
  .object({
    itemType: perkItemTypeSchema.optional(),
    itemKey: itemKeySchema.optional(),
  })
  .strict()

// ----------------------------------------------------------------------------
// email_subscription
// ----------------------------------------------------------------------------
export const emailSubscriptionPatchSchema = z
  .object({
    dailyReport: z.boolean().optional(),
    hourKst: z.number().int().min(0).max(23).optional(),
  })
  .strict()

export type EmailSubscriptionPatchInput = z.infer<
  typeof emailSubscriptionPatchSchema
>
