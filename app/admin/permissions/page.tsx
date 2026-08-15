/**
 * `/admin/permissions` — 구독 등급별 기능 노출 정책 콘솔.
 *
 * 인증은 `/admin` 레이아웃의 `requireAdmin()` 에서 상속한다(Layer 2).
 *
 * **`force-dynamic` + 캐시 우회 조회.** 정책 조회 경로(`getPolicyMap()`)는
 * `unstable_cache` 뒤에 있어 방금 저장한 값이 최대 5분간 안 보인다. 콘솔에서
 * 그건 운영 불가이므로 여기서는 `getOverrideRows()` 로 직접 읽는다
 * (데이터 모델 §6.3-3, `/api/admin/economic-calendar` 의 `force-dynamic` 관례와 동일).
 *
 * 서버가 병합한 결과를 `initial` 로 내려 첫 화면에서 스켈레톤이 번쩍이지 않게
 * 한다. 이후 갱신은 React Query 캐시가 이어받는다.
 */
import type { Metadata } from 'next'
import { getOverrideRows } from '@/lib/permissions/policy-store'
import type { FeaturePermissionRow } from '@/lib/permissions/types'
import { buildAdminFeaturesPayload } from '@/components/admin/permissions/build-payload'
import { PermissionsConsole } from '@/components/admin/permissions/permissions-console'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '권한 관리',
  robots: { index: false, follow: false },
}

export default async function AdminPermissionsPage() {
  // 오버라이드 조회가 실패해도 콘솔은 열려야 한다 — 코드 기본값(=레지스트리)만으로도
  // "지금 무엇이 어떻게 잠겨 있는가" 를 읽을 수 있고, 그 화면이 장애 진단의 출발점이다.
  let rows: FeaturePermissionRow[]
  try {
    rows = await getOverrideRows()
  } catch (err) {
    console.error('[/admin/permissions] override 조회 실패', err)
    rows = []
  }

  const initial = buildAdminFeaturesPayload(rows)

  return <PermissionsConsole initial={initial} />
}
