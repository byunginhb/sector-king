/**
 * PATCH /api/admin/users/subscription — 관리자가 사용자 구독 등급을 부여/변경/회수.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 service_role 인가
 * ────────────────────────────────────────────────────────────────────
 *
 * `profiles` 의 RLS 에는 `profiles_self_select` · `profiles_self_update` ·
 * `profiles_admin_select` 만 있고 **관리자 update 정책이 없다.** 일부러 없다 —
 * RLS 로 열면 브라우저가 들고 있는 사용자 토큰으로도 타인 프로필을 쓸 수 있게
 * 되어, 관리자 계정 탈취 시 피해 범위가 곧바로 전 사용자로 넓어진다.
 * 쓰기는 서버에서만 도는 service_role 로 좁혀 두고, 그 앞을 `requireAdminApi()`
 * 가 지킨다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  행위자 기록 (0015 마이그레이션과 한 쌍)
 * ────────────────────────────────────────────────────────────────────
 *
 * service_role 요청에서는 `auth.uid()` 가 null 이라 감사 트리거가 `changed_by`
 * 를 못 채운다. 그래서 **같은 UPDATE 문 안에** `subscription_updated_by` 를
 * 실어 보내고 트리거가 그것을 쓴다(`coalesce(auth.uid(), …)`). 사유 메모도 같은
 * 길로 흐른다(`profiles.subscription_note` → 트리거 → 로그). 로그 행에 직접
 * INSERT 하면 old_tier 가 빈 가짜 이력이 생기고, 트리거가 방금 넣은 행을 되찾아
 * 고치는 방식은 경합이 생긴다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  free 로 내릴 때 만료일을 지우는 이유
 * ────────────────────────────────────────────────────────────────────
 *
 * `resolveTier()` 는 `free` 를 만료 검사 이전에 반환하므로 남은 만료일은 판정에
 * 아무 영향이 없다. 그런데 화면에는 "미구독 · 2026-12-31 만료" 처럼 남아 서로
 * 모순된 두 사실을 보여준다. 저장 시점에 지운다.
 */
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { subscriptionGrantSchema } from '@/lib/permissions/schema'
import { resolveTier, type StorableTier } from '@/lib/permissions/tier'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/** 수동 부여의 출처 표기. 결제 웹훅이 붙으면 그쪽은 자기 값을 싣는다. */
const MANUAL_SOURCE = 'admin'

export type SubscriptionGrantResult = {
  userId: string
  email: string
  /** 저장된 등급 (free|basic|pro). */
  subscriptionTier: StorableTier
  /** ISO 8601 또는 null(만료 없음). */
  subscriptionExpiresAt: string | null
  /** 만료를 반영한 실효 등급 — 화면이 다시 계산하지 않도록 서버가 확정해 준다. */
  effectiveTier: string
  subscriptionSource: string | null
  subscriptionUpdatedAt: string | null
}

function fail(error: string, status: number) {
  const body: ApiResponse<never> = { success: false, error }
  return NextResponse.json(body, { status })
}

export async function PATCH(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return fail('요청 본문을 읽을 수 없습니다', 400)
  }

  const parsed = subscriptionGrantSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return fail(
      `입력값이 올바르지 않습니다: ${first?.path.join('.') || '본문'} — ${first?.message ?? ''}`,
      400
    )
  }

  const { userId, tier, expiresAt, source, note } = parsed.data
  // free 는 만료라는 개념이 없다(위 주석).
  const nextExpiresAt = tier === 'free' ? null : (expiresAt ?? null)

  const admin = createAdminClient()

  // 존재 확인을 먼저 한다 — update 는 대상이 없어도 0행 갱신으로 조용히 성공한다.
  const { data: target, error: findError } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle()

  if (findError) {
    console.error('[PATCH /api/admin/users/subscription] lookup', findError.message)
    return fail('사용자를 조회할 수 없습니다', 500)
  }
  if (!target) return fail('존재하지 않는 사용자입니다', 404)

  const { data, error } = await admin
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: nextExpiresAt,
      subscription_source: source ?? MANUAL_SOURCE,
      subscription_updated_at: new Date().toISOString(),
      // 감사 트리거가 아래 두 값을 changed_by·note 로 복사한다(0015).
      subscription_updated_by: guard.profile.id,
      subscription_note: note ?? null,
    })
    .eq('id', userId)
    .select(
      'id, email, role, subscription_tier, subscription_expires_at, subscription_source, subscription_updated_at'
    )
    .single()

  if (error || !data) {
    console.error(
      '[PATCH /api/admin/users/subscription] update',
      error?.message ?? 'no row'
    )
    return fail('구독 등급을 변경할 수 없습니다', 500)
  }

  const result: SubscriptionGrantResult = {
    userId: data.id,
    email: data.email,
    subscriptionTier: data.subscription_tier,
    subscriptionExpiresAt: data.subscription_expires_at,
    effectiveTier: resolveTier({
      role: data.role,
      subscriptionTier: data.subscription_tier,
      subscriptionExpiresAt: data.subscription_expires_at,
    }),
    subscriptionSource: data.subscription_source,
    subscriptionUpdatedAt: data.subscription_updated_at,
  }

  const body: ApiResponse<SubscriptionGrantResult> = { success: true, data: result }
  return NextResponse.json(body)
}
