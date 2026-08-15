/**
 * 기능 게이팅 zod 스키마 — 신뢰 경계(어드민 입력 / DB 행)의 유일한 검증 지점.
 *
 * ────────────────────────────────────────────────────────────────────
 *  설계 규약
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **DB CHECK 은 최소한만, 의미 검증은 여기서 한다.** `feature_permissions.params`
 *    의 DB 제약은 `jsonb_typeof(params) = 'object'` 뿐이다. "hidden 인데
 *    visibleRows 가 있다" 같은 조합 오류는 SQL 로 표현하면 마이그레이션이
 *    필요해지므로 zod 가 막는다(gate_mode 별 discriminated union).
 *
 * 2. **알 수 없는 키는 거부한다(strict).** params 오타(`visibleRow`)가 조용히
 *    저장되면 게이트가 "0개 노출"로 fail-close 되어 기능이 통째로 사라진다.
 *    저장 시점에 400 으로 튕기는 편이 낫다.
 *
 * 3. **DB 행 파싱도 여기서 한다(`featurePermissionRowSchema`).** 사람이 psql 로
 *    직접 넣은 행이 런타임 판정에 들어오는 경로가 있으므로, 정책 로더가
 *    검증 없이 신뢰하면 안 된다. 파싱 실패 행은 로더가 버리고 코드 기본값을
 *    쓴다(= 차단 쪽으로 떨어진다).
 *
 * SoT 주의: 등급/게이트 값 목록은 `tier.ts`·`types.ts` 가 원천이다. 아래
 * `_tierExhaustive`/`_gateModeExhaustive` 가 두 목록이 어긋나면 tsc 로 깨진다.
 */
import { z } from 'zod'

import { FEATURE_ID_PATTERN } from './features'
import type { Tier } from './tier'
import type { GateMode, GateParams } from './types'

// ────────────────────────────────────────────────────────────────────
// 원시 값
// ────────────────────────────────────────────────────────────────────

export const tierSchema = z.enum(['anon', 'free', 'basic', 'pro', 'admin'])
export const storableTierSchema = z.enum(['free', 'basic', 'pro'])
export const gateModeSchema = z.enum(['open', 'partial', 'hidden'])

/** `Tier` 에 값이 추가되면 여기서 tsc 가 깨진다 — enum 을 함께 고치라는 신호. */
const _tierExhaustive: Record<Tier, true> = {
  anon: true,
  free: true,
  basic: true,
  pro: true,
  admin: true,
}
/** `GateMode` 에 값이 추가되면 여기서 tsc 가 깨진다. */
const _gateModeExhaustive: Record<GateMode, true> = {
  open: true,
  partial: true,
  hidden: true,
}
void _tierExhaustive
void _gateModeExhaustive

/**
 * featureId — 코드 레지스트리 키 규칙(`FEATURE_ID_PATTERN`)을 그대로 쓴다.
 * DB CHECK 은 이보다 느슨한 상위집합이므로 여기가 실질 게이트다.
 */
export const featureIdSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(FEATURE_ID_PATTERN, 'featureId 형식은 `namespace.feature` 여야 합니다')

/** 노출/은닉 행 수. 음수·소수·NaN 차단. 상한은 실수로 10만을 넣는 것 방지. */
const rowCountSchema = z.coerce.number().int().min(0).max(1000)

/**
 * CTA 착지점 — 내부 경로만 허용(오픈 리다이렉트 차단).
 *
 * 이 값은 `resolveCtaHref()` 를 거쳐 `<Link href>` 에 그대로 들어간다. 그래서
 * `^\/(?!\/)` 하나로는 부족하다 — 제어문자(`/<TAB>/evil.com`)와 백슬래시
 * (`/\evil.com`)는 브라우저·URL 파서가 정규화하면서 `//evil.com` 이 되어
 * 외부 호스트로 나간다. `lib/safe-redirect` 와 같은 판단 기준을 쓴다.
 */
const ctaHrefSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^\/(?![/\\])/, 'CTA 링크는 내부 절대경로(/로 시작)여야 합니다')
  .refine(
    (v) => !/[\u0000-\u001F\u007F\\]/.test(v),
    'CTA 링크에 제어문자·백슬래시를 넣을 수 없습니다'
  )

const ctaShape = {
  ctaHref: ctaHrefSchema.optional(),
  ctaLabel: z.string().min(1).max(60).optional(),
}

// ────────────────────────────────────────────────────────────────────
// gate_mode 별 params
// ────────────────────────────────────────────────────────────────────

/** `open` = 게이트 없음. 파라미터를 받을 자리가 없다. */
export const openParamsSchema = z.object({}).strict()

/** `hidden` = 전량 마스킹. 행 수 파라미터는 의미가 없고 CTA 만 쓴다. */
export const hiddenParamsSchema = z.object({ ...ctaShape }).strict()

/**
 * `partial` = 상위 `visibleRows` 건만 실값, 나머지는 서버가 지운다.
 *
 * 미지정을 허용한다 — 게이트 런타임이 `PARTIAL_DEFAULT_VISIBLE_ROWS`(3건)를
 * 적용하므로 "0개 노출로 조용히 잠기는" 실패 모드가 없다.
 */
export const partialParamsSchema = z
  .object({
    visibleRows: rowCountSchema.optional(),
    ...ctaShape,
  })
  .strict()

/**
 * (gateMode, params) 쌍. 이 조합이 게이팅에서 유일하게 "틀릴 수 있는" 구조라
 * discriminated union 으로 묶는다.
 */
export const gateConfigSchema = z.discriminatedUnion('gateMode', [
  z.object({ gateMode: z.literal('open'), params: openParamsSchema.default({}) }),
  z.object({ gateMode: z.literal('partial'), params: partialParamsSchema.default({}) }),
  z.object({ gateMode: z.literal('hidden'), params: hiddenParamsSchema.default({}) }),
])

export type GateConfig = z.infer<typeof gateConfigSchema>

/** gateMode → 해당 params 스키마. `parseParams` 와 어드민 폼이 공유한다. */
const PARAMS_SCHEMA_BY_MODE = {
  open: openParamsSchema,
  partial: partialParamsSchema,
  hidden: hiddenParamsSchema,
} as const satisfies Record<GateMode, z.ZodTypeAny>

/**
 * 저장된 params 를 게이트 판정용으로 해석한다.
 *
 * **파싱 실패는 throw 하지 않고 `{}` 로 떨어진다.** 정책 행 하나가 깨졌다고
 * 페이지 전체가 500 이 되면 안 되고, `{}` 는 게이트 런타임에서 가장 보수적인
 * 해석(hidden 은 0건, partial 은 기본 3건)이라 크게 새지 않는다.
 *
 * 반대로 어드민 저장 경로는 `gateConfigSchema` 로 **엄격히** 검증해 오타를
 * 저장 시점에 튕긴다 — 읽기는 관대하게, 쓰기는 엄격하게.
 */
export function parseParams(gateMode: GateMode, raw: unknown): GateParams {
  const schema = PARAMS_SCHEMA_BY_MODE[gateMode]
  if (!schema) return {}
  const result = schema.safeParse(raw ?? {})
  return result.success ? (result.data as GateParams) : {}
}

// ────────────────────────────────────────────────────────────────────
// 어드민 API 입력 DTO
// ────────────────────────────────────────────────────────────────────

/**
 * 정책 DTO 를 만드는 팩토리.
 *
 * **`z.object(...).and(gateConfigSchema)` 로 합치지 말 것.** zod 4 의 교집합은
 * 양쪽을 각각 파싱한 뒤 결과를 병합하는데, 이 과정에서 오른쪽 객체의
 * `strict` 위반과 `refine` 실패가 **조용히 삼켜진다**(실측: `params` 에 오타
 * `visibleRow` 를 넣으면 discriminated union 단독으로는 실패하지만
 * 교집합으로 감싸면 `params: {}` 로 성공한다). 게이팅에서 그 결과는
 * "0건 노출"이라 기능이 통째로 사라지고, 400 도 안 나므로 원인 추적이 어렵다.
 * 그래서 각 variant 에 공통 필드를 **펼쳐 넣어** 단일 discriminated union 을
 * 유지한다.
 */
function buildPolicySchema<Extra extends z.ZodRawShape>(extra: Extra) {
  const base = {
    ...extra,
    minTier: tierSchema,
    note: z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().max(500).nullable().optional()
    ),
  }

  return z.discriminatedUnion('gateMode', [
    z.object({ ...base, gateMode: z.literal('open'), params: openParamsSchema.default({}) }),
    z.object({ ...base, gateMode: z.literal('partial'), params: partialParamsSchema.default({}) }),
    z.object({ ...base, gateMode: z.literal('hidden'), params: hiddenParamsSchema.default({}) }),
  ])
}

/**
 * 정책 본문 (단건 저장 — featureId 는 경로 세그먼트에서 온다).
 *
 * `updatedBy` 는 **클라이언트에서 받지 않는다** — 서버가 세션에서 채운다
 * (감사 로그의 changed_by 가 이 값으로 폴백하므로 위조되면 이력이 거짓이 된다).
 */
export const featurePolicyBodySchema = buildPolicySchema({})

export type FeaturePolicyBody = z.infer<typeof featurePolicyBodySchema>

/** 정책 1건 (일괄 저장 배열의 원소 — featureId 포함). */
export const featurePolicyItemSchema = buildPolicySchema({
  featureId: featureIdSchema,
})

export type FeaturePolicyItem = z.infer<typeof featurePolicyItemSchema>

/**
 * 일괄 저장 — 어드민 콘솔이 한 페이지 분량을 한 번에 커밋한다.
 *
 * 상한 200: 카탈로그 규모(수백)를 넘지 않으면서, 실수로 거대한 배열이
 * 들어와 감사 트리거가 수천 행을 쓰는 것을 막는다.
 */
export const featurePolicyBulkSchema = z
  .object({
    items: z.array(featurePolicyItemSchema).min(1).max(200),
  })
  .strict()
  .refine((body) => {
    const ids = body.items.map((i) => i.featureId)
    return new Set(ids).size === ids.length
  }, '같은 featureId 가 두 번 들어 있습니다')

export type FeaturePolicyBulk = z.infer<typeof featurePolicyBulkSchema>

/** 오버라이드 삭제(= 코드 기본값으로 되돌리기) 대상 목록. */
export const featurePolicyResetSchema = z
  .object({
    featureIds: z.array(featureIdSchema).min(1).max(200),
  })
  .strict()

export type FeaturePolicyReset = z.infer<typeof featurePolicyResetSchema>

// ────────────────────────────────────────────────────────────────────
// DB 행 파싱
// ────────────────────────────────────────────────────────────────────

/**
 * `feature_permissions` 행 → `FeaturePermissionRow`(camelCase).
 *
 * params 는 여기서 통과시키고(모드별 해석은 `parseParams` 가 담당), 등급·모드는
 * 엄격히 검증한다. 등급 문자열이 깨진 행을 통과시키면 `hasTier` 가 false 로
 * 떨어져 조용히 전면 차단되는데, 그건 "정책이 이상하다"는 신호를 삼켜버린다.
 */
export const featurePermissionRowSchema = z
  .object({
    feature_id: z.string(),
    min_tier: tierSchema,
    gate_mode: gateModeSchema,
    params: z.unknown().optional(),
    note: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .transform((row) => ({
    featureId: row.feature_id,
    minTier: row.min_tier,
    gateMode: row.gate_mode,
    params: parseParams(row.gate_mode, row.params),
    note: row.note ?? null,
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at ?? '',
  }))

// ────────────────────────────────────────────────────────────────────
// 구독 등급 부여 (어드민 → service_role 경로)
// ────────────────────────────────────────────────────────────────────

/**
 * `/admin/users` 의 등급 부여/회수 입력.
 *
 * `expiresAt` 은 **timestamptz 절대시각**(ISO 8601)만 받는다. 날짜만 받으면
 * 서버가 KST/UTC 중 무엇으로 해석할지 정해야 하고, 그 결정이 만료 판정
 * (`expires_at <= now()`)과 어긋나면 하루치 권한이 새거나 사라진다.
 * `null` = 만료 없음(영구 부여).
 */
export const subscriptionGrantSchema = z
  .object({
    userId: z.string().uuid(),
    tier: storableTierSchema,
    expiresAt: z.preprocess(
      (v) => (v === '' ? null : v),
      z
        .string()
        .datetime({ offset: true })
        .nullable()
        .optional()
    ),
    source: z.string().max(40).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .strict()

export type SubscriptionGrant = z.infer<typeof subscriptionGrantSchema>
