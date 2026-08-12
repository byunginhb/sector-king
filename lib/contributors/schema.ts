/**
 * contributors(섹터킹 소개 인물) 관리자 zod 스키마.
 *
 * 순수 표시용 인물 카드 — 통화/종목 도메인 무관. 수동 전용(자동 수집 없음).
 * 소셜 URL 은 빈 문자열→null 정규화 후 http(s) 화이트리스트 검증(저장형 XSS 심층방어).
 */
import { z } from 'zod'

export const genderSchema = z.enum(['male', 'female'])

/** 아바타 프리셋 인덱스 상한 — components/contributors/pixel-avatar 의 AVATAR_PRESETS 길이와 일치 */
export const AVATAR_VARIANT_COUNT = 10

const optionalUrl = z.preprocess(
  (v) => (v === '' ? null : v),
  z
    .string()
    .url('올바른 URL 형식이어야 합니다')
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), 'http(s) URL만 허용됩니다')
    .nullable()
    .optional()
)

export const contributorInputSchema = z
  .object({
    nickname: z.string().min(1, '닉네임을 입력하세요').max(60),
    bio: z.string().max(200).nullable().optional(),
    email: z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().email('올바른 이메일 형식이어야 합니다').max(200).nullable().optional()
    ),
    instagramUrl: optionalUrl,
    threadsUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    blogUrl: optionalUrl,
    gender: genderSchema.default('male'),
    avatarVariant: z.coerce.number().int().min(0).max(AVATAR_VARIANT_COUNT - 1).default(0),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .strict()

export type ContributorInput = z.infer<typeof contributorInputSchema>

export const contributorPatchSchema = contributorInputSchema.partial().strict()
export type ContributorPatch = z.infer<typeof contributorPatchSchema>
