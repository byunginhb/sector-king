/**
 * 레지스트리(코드 SoT) + DB 오버라이드 → 콘솔 페이로드 병합. **서버 전용 순수 함수.**
 *
 * 페이지 서버 컴포넌트와 `/api/admin/features` 가 같은 함수를 쓴다. 두 곳이
 * 각자 병합하면 "새로고침하면 값이 다르다" 가 반드시 생긴다.
 *
 * 병합 규칙(데이터 모델 §3.2·§3.4):
 * - 레지스트리에 있고 DB 행 없음  → 미설정. `defaultPolicy` 가 곧 정책이다(결손 아님).
 * - 레지스트리에 있고 DB 행 있음  → 오버라이드가 이긴다.
 * - DB 행만 있고 레지스트리 없음  → 고아. 판정에 참여하지 않으며 자동 삭제하지 않는다.
 */
import { PAGES, FEATURES } from '@/lib/permissions/features'
import type { FeaturePermissionRow } from '@/lib/permissions/types'
import type {
  AdminFeatureRow,
  AdminFeaturesPayload,
  AdminPageMeta,
  OrphanRow,
} from './types'

/** 고아 행을 "정리 권장" 으로 표시하는 경과 기준. */
const ORPHAN_STALE_DAYS = 90

/**
 * 낙관적 락 지문. 시각만 쓰면 최신이 아닌 행의 삭제를 놓치므로 행 수를 함께 넣는다.
 * 오버라이드가 하나도 없으면 `null`(빈 테이블이 정상 상태다).
 */
export function computeBaseVersion(rows: FeaturePermissionRow[]): string | null {
  if (rows.length === 0) return null
  let max = ''
  for (const r of rows) if (r.updatedAt > max) max = r.updatedAt
  return `${max}|${rows.length}`
}

export function buildAdminFeaturesPayload(
  rows: FeaturePermissionRow[]
): AdminFeaturesPayload {
  const overrides = new Map<string, FeaturePermissionRow>()
  for (const row of rows) overrides.set(row.featureId, row)

  const features: AdminFeatureRow[] = []
  const usedPageIds = new Set<string>()

  for (const [featureId, def] of Object.entries(FEATURES)) {
    const override = overrides.get(featureId)
    const defaults = def.defaultPolicy
    usedPageIds.add(def.pageId)

    features.push({
      featureId,
      label: def.label,
      description: def.description ?? null,
      pageId: def.pageId,
      location: def.location ?? null,
      masking: def.masking,
      seoIndexed: def.seoIndexed === true,
      retired: def.retired === true,
      wired: def.wired === true,
      supportedGateModes: def.supportedGateModes
        ? [...def.supportedGateModes]
        : null,
      recommendedMinTier: def.recommendedMinTier ?? null,
      recommendedGateMode: def.recommendedGateMode ?? null,
      defaultPolicy: {
        minTier: defaults.minTier,
        gateMode: defaults.gateMode,
        params: defaults.params ?? {},
      },
      effective: override
        ? {
            minTier: override.minTier,
            gateMode: override.gateMode,
            params: override.params ?? {},
          }
        : {
            minTier: defaults.minTier,
            gateMode: defaults.gateMode,
            params: defaults.params ?? {},
          },
      overridden: Boolean(override),
      note: override?.note ?? null,
      updatedBy: override?.updatedBy ?? null,
      updatedAt: override?.updatedAt ?? null,
    })
  }

  // 고아 — 레지스트리 키가 아닌 DB 행.
  const staleBefore = Date.now() - ORPHAN_STALE_DAYS * 24 * 60 * 60 * 1000
  const orphans: OrphanRow[] = rows
    .filter((row) => !(row.featureId in FEATURES))
    .map((row) => {
      const t = Date.parse(row.updatedAt)
      return {
        featureId: row.featureId,
        minTier: row.minTier,
        gateMode: row.gateMode,
        params: row.params ?? {},
        note: row.note,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
        stale: Number.isFinite(t) && t < staleBefore,
      }
    })
    .sort((a, b) => (a.featureId < b.featureId ? -1 : 1))

  // 페이지 목록 — 레지스트리 순서를 그대로 쓰되, 기능이 참조하는데 PAGES 에 없는
  // pageId 는 자리를 만들어 드러낸다(조용히 사라지면 그 기능이 화면에서 실종된다).
  const countByPage = new Map<string, number>()
  for (const f of features) {
    countByPage.set(f.pageId, (countByPage.get(f.pageId) ?? 0) + 1)
  }

  const declared: AdminPageMeta[] = [...PAGES]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      id: p.id,
      label: p.label,
      route: p.route,
      order: p.order,
      adminOnly: p.adminOnly === true,
      featureCount: countByPage.get(p.id) ?? 0,
      synthetic: false,
    }))

  const declaredIds = new Set(declared.map((p) => p.id))
  const synthetic: AdminPageMeta[] = [...usedPageIds]
    .filter((id) => !declaredIds.has(id))
    .sort()
    .map((id) => ({
      id,
      label: id,
      route: '',
      order: Number.MAX_SAFE_INTEGER,
      adminOnly: false,
      featureCount: countByPage.get(id) ?? 0,
      synthetic: true,
    }))

  return {
    pages: [...declared, ...synthetic],
    features,
    orphans,
    baseVersion: computeBaseVersion(rows),
  }
}
