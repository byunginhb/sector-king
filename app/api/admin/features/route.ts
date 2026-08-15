/**
 * GET /api/admin/features — 기능 레지스트리 + DB 오버라이드 병합 목록 (관리자 전용)
 * PUT /api/admin/features — **일괄 저장**. 변경된 행만 upsert/delete.
 *
 * 저장소: Supabase `feature_permissions`(런타임 어드민 CRUD → 커밋 SQLite 불가).
 * 통화·시세와 무관한 정책 도메인이라 `toUsd` 대상 아님.
 *
 * ────────────────────────────────────────────────────────────────────
 *  이 라우트가 지키는 규약
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **캐시 우회.** 조회는 `getOverrideRows()`(캐시 없는 직접 조회)를 쓴다.
 *    `getPolicyMap()` 은 `unstable_cache` 뒤에 있어 방금 저장한 값이 최대
 *    5분간 안 보인다 — 콘솔에서 그건 운영 불가다(데이터 모델 §6.3-3).
 *
 * 2. **일괄 저장.** 행 단위 즉시 저장을 하지 않는다. 권한은 행끼리 상호
 *    의존하므로("표를 Pro 로 올린다" 와 "그 표로 가는 링크도 올린다" 는 한
 *    결정), 행마다 저장하면 그 사이 몇 초 동안 잠긴 곳으로 가는 링크가 열려
 *    있는 상태가 실서비스에 노출된다(UI 기획 §A-4).
 *
 * 3. **기본값으로 되돌리기 = 행 삭제.** 빈 오버라이드 행은 "이 오버라이드를
 *    끈다" 가 아니라 킬 스위치(전원 차단)다. 두 의미를 겹치면 "행 있음 +
 *    비활성" 과 "행 없음" 이 같은 뜻이 되는 중복 상태가 생긴다(§3.3).
 *
 * 4. **낙관적 락.** `baseVersion` 이 어긋나면 409 + 현재 서버 상태를 함께
 *    돌려준다. 강제 새로고침으로 관리자의 편집분을 날리지 않기 위해서다.
 *
 * 5. **`updated_by` 는 서버가 채운다.** 감사 트리거가
 *    `coalesce(auth.uid(), new.updated_by)` 로 기록자를 남기므로, 앱이 이
 *    값을 넣지 않으면 감사 로그의 주체가 비게 된다(데이터 모델 §4.1).
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import {
  getOverrideRows,
  invalidatePolicyCache,
} from '@/lib/permissions/policy-store'
import {
  featureIdSchema,
  featurePolicyItemSchema,
} from '@/lib/permissions/schema'
import { getFeature } from '@/lib/permissions/features'
import {
  buildAdminFeaturesPayload,
  computeBaseVersion,
} from '@/components/admin/permissions/build-payload'
import type { AdminFeaturesPayload } from '@/components/admin/permissions/types'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

// ── 입력 스키마 ────────────────────────────────────────────────────────
// upsert 원소는 `featurePolicyItemSchema` 를 **그대로** 쓴다. gate_mode 별
// params 규약(예: partial 의 hiddenRows)이 거기 있고,
// 쓰기 경로는 엄격해야 한다 — `parseParams` 는 읽기용이라 실패를 `{}` 로
// 흡수하므로 저장 검증에 쓰면 오타난 파라미터가 조용히 "0건 노출"이 된다.
const saveSchema = z
  .object({
    baseVersion: z.string().max(160).nullable(),
    items: z.array(featurePolicyItemSchema).max(200).default([]),
    resetIds: z.array(featureIdSchema).max(200).default([]),
  })
  .strict()
  .refine(
    (b) => b.items.length + b.resetIds.length > 0,
    '변경할 항목이 없습니다'
  )
  .refine((b) => {
    const ids = [...b.items.map((i) => i.featureId), ...b.resetIds]
    return new Set(ids).size === ids.length
  }, '같은 featureId 가 두 번 들어 있습니다')

function fail(
  error: string,
  status: number,
  data?: AdminFeaturesPayload
): NextResponse {
  const body: ApiResponse<AdminFeaturesPayload> = { success: false, error, data }
  return NextResponse.json(body, { status })
}

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const rows = await getOverrideRows()
    const body: ApiResponse<AdminFeaturesPayload> = {
      success: true,
      data: buildAdminFeaturesPayload(rows),
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[GET /api/admin/features] unexpected', err)
    return fail('정책 목록을 불러올 수 없습니다', 500)
  }
}

export async function PUT(req: Request) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const json = await req.json().catch(() => null)
    const parsed = saveSchema.safeParse(json)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      // zod 이슈 경로 `items.<n>.params...` 에서 어느 행이 틀렸는지 되짚는다.
      // 그래야 화면이 "어딘가 잘못됐다" 가 아니라 그 행을 짚어 보여줄 수 있다.
      const idx = issue?.path?.[0] === 'items' ? Number(issue.path[1]) : NaN
      const raw = json as { items?: Array<{ featureId?: string }> } | null
      const culprit = Number.isInteger(idx)
        ? raw?.items?.[idx]?.featureId
        : undefined
      const body: ApiResponse<AdminFeaturesPayload> = {
        success: false,
        error: culprit
          ? `${culprit}: ${issue?.message ?? '입력값 검증 실패'}`
          : (issue?.message ?? '입력값 검증 실패'),
      }
      return NextResponse.json(
        { ...body, invalid: culprit ? [culprit] : [] },
        { status: 400 }
      )
    }
    const { baseVersion, items, resetIds } = parsed.data

    // ── 낙관적 락 ────────────────────────────────────────────────────
    const currentRows = await getOverrideRows()
    const currentVersion = computeBaseVersion(currentRows)
    if (baseVersion !== currentVersion) {
      return fail(
        '다른 관리자가 정책을 수정했습니다. 최신 상태를 확인한 뒤 다시 저장하세요.',
        409,
        buildAdminFeaturesPayload(currentRows)
      )
    }

    // ── 행 단위 검증 (전부 통과해야 한 건이라도 쓴다) ──────────────────
    // `resetIds` 는 검증하지 않는다 — 삭제는 언제나 안전한 방향(코드 기본값
    // 복귀)이고, 고아 정리가 같은 경로를 쓰기 때문에 레지스트리 존재를 물으면
    // 정작 지워야 할 행을 못 지운다.
    const invalid: string[] = []
    const now = new Date().toISOString()

    const upsertRows = items.flatMap((item) => {
      const def = getFeature(item.featureId)
      if (!def) {
        // 레지스트리에 없는 키로 오버라이드를 만들면 그 순간 고아가 된다.
        invalid.push(item.featureId)
        return []
      }
      // 잠그면 안 되는 기능(`supportedGateModes: ['open']`)에 게이트를 걸려는
      // 시도는 화면에서도 막지만, 요청은 화면을 거치지 않고도 올 수 있다.
      if (
        def.supportedGateModes &&
        !def.supportedGateModes.includes(item.gateMode)
      ) {
        invalid.push(item.featureId)
        return []
      }

      return [
        {
          feature_id: item.featureId,
          min_tier: item.minTier,
          gate_mode: item.gateMode,
          params: item.params,
          note: item.note ?? null,
          updated_by: guard.profile.id,
          updated_at: now,
        },
      ]
    })

    if (invalid.length > 0) {
      const body: ApiResponse<AdminFeaturesPayload> = {
        success: false,
        error: `저장할 수 없는 항목이 있습니다: ${invalid.join(', ')}`,
      }
      return NextResponse.json({ ...body, invalid }, { status: 400 })
    }

    // ── 쓰기 ─────────────────────────────────────────────────────────
    // PostgREST 는 여러 statement 를 한 트랜잭션으로 묶지 못한다. upsert 는
    // 단일 statement 라 그 안에서는 원자적이고, delete 도 마찬가지다. 검증을
    // 전부 통과시킨 뒤에만 쓰기 때문에 남는 실패는 DB 장애뿐이고, 그때는
    // 아래에서 재조회한 실제 상태를 그대로 돌려준다(화면이 거짓을 말하지 않게).
    const supabase = await createClient()

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from('feature_permissions')
        .upsert(upsertRows, { onConflict: 'feature_id' })
      if (error) {
        console.error('[PUT /api/admin/features] upsert error', error.message)
        return fail('정책을 저장할 수 없습니다', 500)
      }
    }

    if (resetIds.length > 0) {
      const { error } = await supabase
        .from('feature_permissions')
        .delete()
        .in('feature_id', resetIds)
      if (error) {
        console.error('[PUT /api/admin/features] delete error', error.message)
        return fail('기본값 복귀를 저장할 수 없습니다', 500)
      }
    }

    // 정상 경로 무효화(§6.3-1). 백스톱은 `POLICY_CACHE_REVALIDATE_SEC`.
    invalidatePolicyCache()

    const freshRows = await getOverrideRows()
    const body: ApiResponse<AdminFeaturesPayload> = {
      success: true,
      data: buildAdminFeaturesPayload(freshRows),
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[PUT /api/admin/features] unexpected', err)
    return fail('서버 오류가 발생했습니다', 500)
  }
}
