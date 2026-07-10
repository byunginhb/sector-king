/**
 * 경제 캘린더(economic_events) 관리자 zod 스키마.
 *
 * - 관리자 입력 검증 (POST/PATCH /api/admin/economic-calendar/*)
 * - 목록 필터 쿼리 검증 (GET)
 * - 값(actual/forecast/previous)은 통화 무관 원문 문자열 → toUsd 불요.
 * - 일시는 KST 확정값(어드민 입력=KST, 이중변환 금지).
 */
import { z } from 'zod'

export const countrySchema = z.enum(['KR', 'US'])
export const categorySchema = z.enum(['indicator', 'earnings', 'event'])
export const importanceSchema = z.enum(['high', 'medium', 'low'])

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM(24h) 형식이어야 합니다')

/**
 * 관리자 수동 생성 입력.
 * source/external_id/is_locked 등은 서버가 강제(클라이언트 신뢰 안 함).
 */
export const eventInputSchema = z
  .object({
    country: countrySchema,
    category: categorySchema.default('indicator'),
    importance: importanceSchema.default('medium'),
    title: z.string().min(1).max(200),
    titleEn: z.string().max(200).nullable().optional(),
    eventDate: dateSchema,
    eventTime: timeSchema.nullable().optional(), // null=종일
    actual: z.string().max(60).nullable().optional(),
    forecast: z.string().max(60).nullable().optional(),
    previous: z.string().max(60).nullable().optional(),
    unit: z.string().max(20).nullable().optional(),
    // 출처 원문 URL(선택). 빈 문자열은 null 로 정규화 후 url() 검증.
    // http(s) 화이트리스트로 javascript:/data: 등 스킴 차단(저장형 XSS 심층방어).
    sourceUrl: z.preprocess(
      (v) => (v === '' ? null : v),
      z
        .string()
        .url('올바른 URL 형식이어야 합니다')
        .max(500)
        .refine((u) => /^https?:\/\//i.test(u), 'http(s) URL만 허용됩니다')
        .nullable()
        .optional()
    ),
    relatedIndustryId: z.string().max(40).nullable().optional(), // MVP null
  })
  .strict()

export type EventInput = z.infer<typeof eventInputSchema>

/**
 * 부분 수정. 추가로 어드민 전용 플래그(충돌정책 §4)를 토글 가능.
 */
export const eventPatchSchema = eventInputSchema
  .partial()
  .extend({
    isHidden: z.boolean().optional(), // 자동분 소프트 삭제 / 복원
    isLocked: z.boolean().optional(), // 자동분 수동 고정 토글
  })
  .strict()

export type EventPatch = z.infer<typeof eventPatchSchema>

/** 어드민 목록 필터 쿼리 */
export const adminEventListQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  country: z.enum(['KR', 'US', 'all']).default('all'),
  category: z.enum(['indicator', 'earnings', 'event', 'all']).default('all'),
  source: z.string().max(20).default('all'), // 'all' | 'manual' | 'fred' ...
  importance: z.enum(['high', 'medium', 'low', 'all']).default('all'),
  includeHidden: z.coerce.boolean().default(true), // 어드민은 숨김도 표시
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export type AdminEventListQuery = z.infer<typeof adminEventListQuerySchema>
