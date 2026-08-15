/**
 * DELETE /api/admin/features/[featureId] — 오버라이드 행 제거 = 코드 기본값 복귀.
 *
 * 두 가지 용도가 같은 동작을 공유한다:
 *  1. 레지스트리에 있는 기능의 "기본값으로 되돌리기"(행 삭제 = 기본값)
 *  2. **고아 행 수동 정리** — 코드에서 사라진 `feature_id` 의 잔존 행.
 *
 * 고아를 자동 삭제하지 않는 이유(데이터 모델 §3.4): 리네임 중이거나 배포를
 * 롤백해 코드가 되돌아올 수 있고, 그때 `enabled=false` 킬 스위치나 프로모션
 * 개방이 소리 없이 사라진다. 특히 킬 스위치가 사라지면 장애 상태가 다시
 * 노출된다 — 자동 삭제의 최악 시나리오다. 그래서 사람이 누르는 이 경로만 둔다.
 *
 * 콘솔의 일괄 저장(`PUT /api/admin/features` 의 `resetIds`)과 같은 결과를 내지만,
 * 이 라우트는 draft 와 무관한 단건 즉시 삭제다(고아는 표에 없다).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/auth/require-admin-api'
import {
  getOverrideRows,
  invalidatePolicyCache,
} from '@/lib/permissions/policy-store'
import { buildAdminFeaturesPayload } from '@/components/admin/permissions/build-payload'
import type { AdminFeaturesPayload } from '@/components/admin/permissions/types'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const FEATURE_ID_SHAPE = /^[a-z0-9]+([._-][a-z0-9]+)*$/

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const { featureId } = await params
    // DB CHECK(`feature_permissions_feature_id_format`)와 같은 형태만 받는다.
    // 형식이 다르면 애초에 저장될 수 없었던 값이라 조회할 것도 없다.
    if (!featureId || !FEATURE_ID_SHAPE.test(featureId)) {
      const body: ApiResponse<AdminFeaturesPayload> = {
        success: false,
        error: '잘못된 기능 id 입니다',
      }
      return NextResponse.json(body, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('feature_permissions')
      .delete()
      .eq('feature_id', featureId)

    if (error) {
      console.error(
        '[DELETE /api/admin/features/[featureId]] delete error',
        error.message
      )
      const body: ApiResponse<AdminFeaturesPayload> = {
        success: false,
        error: '오버라이드를 삭제할 수 없습니다',
      }
      return NextResponse.json(body, { status: 500 })
    }

    invalidatePolicyCache()

    const rows = await getOverrideRows()
    const body: ApiResponse<AdminFeaturesPayload> = {
      success: true,
      data: buildAdminFeaturesPayload(rows),
    }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[DELETE /api/admin/features/[featureId]] unexpected', err)
    const body: ApiResponse<AdminFeaturesPayload> = {
      success: false,
      error: '서버 오류가 발생했습니다',
    }
    return NextResponse.json(body, { status: 500 })
  }
}
