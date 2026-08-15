/**
 * `/admin/permissions` 콘솔의 **전송 계약(wire DTO)**.
 *
 * 서버(페이지 서버 컴포넌트 · `/api/admin/features`)와 클라이언트(콘솔 컴포넌트,
 * `hooks/use-admin-features`)가 공유한다. 런타임 판정 타입은 전부
 * `lib/permissions/*` 계약 파일에서 가져오고 여기서 재정의하지 않는다.
 *
 * 이 파일에 정책 판정 로직을 두지 않는다 — 매트릭스 5열은 `decideGate()` 가
 * 유일한 원천이며(§A-3 "읽기 전용 파생 표시"), 여기서 파생 규칙을 다시 적으면
 * 어드민 화면과 실제 게이트가 갈라진다.
 */
import type { Tier } from '@/lib/permissions/tier'
import type {
  GateMode,
  GateParams,
  MaskingRequirement,
} from '@/lib/permissions/types'

/** 좌측 페이지 리스트 한 줄. */
export type AdminPageMeta = {
  id: string
  label: string
  /** 대표 경로. 동적 세그먼트는 그대로 (`/stock/[ticker]`). */
  route: string
  order: number
  adminOnly: boolean
  /** 이 페이지에 속한 기능 수. */
  featureCount: number
  /**
   * 레지스트리 `PAGES` 에 없는 `pageId` 를 기능이 참조할 때 만들어지는 자리.
   * 정상 상태에서는 없다 — 있으면 레지스트리 배선 누락이다.
   */
  synthetic: boolean
}

/** 기능 표 한 줄 = 레지스트리 항목 + DB 오버라이드 병합 결과. */
export type AdminFeatureRow = {
  featureId: string
  label: string
  description: string | null
  pageId: string
  location: string | null
  masking: MaskingRequirement
  seoIndexed: boolean
  retired: boolean
  /**
   * 게이트가 실제로 배선돼 있는가(`FeatureDef.wired`).
   *
   * false 면 저장은 되지만 사용자 화면은 바뀌지 않는다. 표가 배지로,
   * 헤더가 배너로 알린다 — 안 알리면 콘솔이 거짓말을 한다.
   */
  wired: boolean
  /** 지정돼 있으면 게이트 셀렉트를 이 목록으로 제한한다. */
  supportedGateModes: GateMode[] | null
  /** 카탈로그 조사 제안값. 표시 전용 — 판정에 관여하지 않는다. */
  recommendedMinTier: Tier | null
  recommendedGateMode: GateMode | null
  /** 코드 기본값. "기본값으로 되돌리기" 의 목적지이자 오버라이드 삭제의 결과. */
  defaultPolicy: {
    minTier: Tier
    gateMode: GateMode
    params: GateParams
    /** 코드 기본값에는 킬 스위치가 없다 — 항상 true. */
    enabled: true
  }
  /** 현재 실제 정책(오버라이드가 있으면 그 값, 없으면 기본값). */
  effective: {
    minTier: Tier
    gateMode: GateMode
    params: GateParams
    enabled: boolean
  }
  /** DB 오버라이드 행 존재 여부. */
  overridden: boolean
  note: string | null
  updatedBy: string | null
  updatedAt: string | null
}

/** 레지스트리에 없는데 DB 에만 있는 행. 자동 삭제 금지 — 수동 정리만. */
export type OrphanRow = {
  featureId: string
  minTier: Tier
  gateMode: GateMode
  params: GateParams
  enabled: boolean
  note: string | null
  updatedBy: string | null
  updatedAt: string
  /** `updated_at` 이 90일 이상 경과 — "리네임 흔적일 가능성 낮음, 정리 권장". */
  stale: boolean
}

/** 콘솔이 한 번에 받는 전부. GET · PUT · DELETE 응답이 전부 이 형태다. */
export type AdminFeaturesPayload = {
  pages: AdminPageMeta[]
  features: AdminFeatureRow[]
  orphans: OrphanRow[]
  /**
   * 낙관적 락 지문. `"<가장 최근 updated_at>|<오버라이드 행 수>"`.
   *
   * 행 수를 함께 넣는 이유: 최신이 아닌 행 하나가 삭제되면 max 는 그대로라
   * 시각만으로는 동시 편집을 놓친다. 오버라이드가 없으면 `null`.
   */
  baseVersion: string | null
}

/** 일괄 저장의 upsert 1건. `lib/permissions/schema` 의 `featurePolicyItemSchema` 와 같은 모양. */
export type SaveFeatureItem = {
  featureId: string
  minTier: Tier
  gateMode: GateMode
  params: GateParams
  enabled: boolean
  note: string | null
}

/**
 * 일괄 저장 요청.
 *
 * upsert 와 삭제를 **한 요청 안의 서로 다른 배열**로 나눈다. `action` 필드를
 * 가진 단일 배열로 합치면 upsert 원소가 `featurePolicyItemSchema`(gateMode 별
 * params discriminated union) 로 직접 검증되지 못하고, zod 4 에서는 그 조합이
 * strict/refine 위반을 조용히 삼킨 전례가 있다(schema.ts 주석 참조).
 */
export type SaveFeaturesInput = {
  baseVersion: string | null
  /** 오버라이드 생성/갱신. */
  items: SaveFeatureItem[]
  /** 오버라이드 행 삭제 = 코드 기본값 복귀. */
  resetIds: string[]
}

/** 클라이언트 draft 한 줄. 저장 전까지 화면의 진실. */
export type DraftPolicy = {
  minTier: Tier
  gateMode: GateMode
  params: GateParams
  enabled: boolean
  note: string | null
}

/** 콘솔 필터 상태 — URL 에 동기화하지 않는다(§A-4: GET 이동은 draft 를 날린다). */
export type ConsoleFilters = {
  q: string
  minTier: Tier | 'all'
  gateMode: GateMode | 'all'
  status: 'all' | 'unset' | 'changed' | 'disabled' | 'nondefault'
}

export const EMPTY_FILTERS: ConsoleFilters = {
  q: '',
  minTier: 'all',
  gateMode: 'all',
  status: 'all',
}
