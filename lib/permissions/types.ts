/**
 * 기능 게이팅 공용 타입 계약.
 *
 * 이 파일은 4개 레이어(레지스트리 / 정책 조회 / 어드민 API / 화면 게이트)가
 * 공유하는 유일한 계약이다. 레이어끼리 서로의 내부 타입을 import 하지 않는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  못 박아 두는 원칙 3가지
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **마스킹은 서버에서 한다.** CSS blur 와 클라이언트 slice 는 DevTools 로
 *    벗겨지고 네트워크 탭에 원본이 그대로 남는다. `params.visibleRows` 는
 *    "서버가 몇 개를 실값으로 보낼지"를 정하는 값이지 CSS 값이 아니다.
 *    클라이언트는 **이미 지워진 데이터**에 시각 효과만 입힌다.
 *
 * 2. **카탈로그 SoT 는 코드(`features.ts`), DB 는 오버라이드만 저장한다.**
 *    행이 없으면 코드 기본값이 곧 정책이다. 그래서 게이트 코드와 그 기본
 *    정책이 항상 같은 커밋에 있고, "배포는 됐는데 DB 행이 없어 게이트가
 *    열려 있는 창"이 존재하지 않는다.
 *
 * 3. **크롤러는 `anon` 등급이다. 예외 없다.** User-Agent 로 게이트를
 *    완화하는 코드를 어디에도 두지 않는다. 크롤러가 보는 것 = 비로그인
 *    사용자가 보는 것 — 이 한 줄이 cloaking 을 원천 차단한다.
 */

import type { Tier } from './tier'

/**
 * 게이트 방식.
 *
 * - `open`    게이트 없음 (기본)
 * - `hidden`  진입점 자체를 렌더하지 않음. API 는 값을 아예 제외
 * - `blur`    형상만 남기고 흐림 + 업셀 오버레이. **서버가 값을 더미로 대체**
 * - `partial` 상위 N개만 실값, 나머지는 서버가 마스킹
 * - `teaser`  개별 값 대신 건수·범위 같은 메타만
 */
export type GateMode = 'open' | 'hidden' | 'blur' | 'partial' | 'teaser'

/** 화면 표기용 한글 라벨. 어드민 표와 범례가 공유한다. */
export const GATE_MODE_LABEL: Record<GateMode, string> = {
  open: '보임',
  hidden: '숨김',
  blur: '흐림',
  partial: '일부',
  teaser: '요약',
}

export const GATE_MODES: readonly GateMode[] = [
  'open',
  'hidden',
  'blur',
  'partial',
  'teaser',
]

export function isGateMode(value: unknown): value is GateMode {
  return typeof value === 'string' && value in GATE_MODE_LABEL
}

/**
 * 게이트 파라미터.
 *
 * `visibleRows` 는 서버가 실값으로 내보낼 항목 수다(§원칙 1).
 * `blurTopK` 는 "상위 K개를 가리고 K+1 번째부터 공개" 하는 역방향 partial 로,
 * 애널리스트 순위처럼 상위가 곧 상품인 리스트에 쓴다.
 * 둘 중 하나만 쓴다 — 동시 지정 시 `blurTopK` 가 우선한다.
 */
export type GateParams = {
  /** 상위 N개를 실값으로 노출. `partial`/`teaser` 에서 사용. */
  visibleRows?: number
  /** 상위 K개를 가리고 그 이후를 노출. `partial` 에서 사용. */
  blurTopK?: number
  /** 업셀 CTA 착지점 오버라이드. 미지정 시 등급별 기본값. */
  ctaHref?: string
  /** 업셀 문구 오버라이드. 미지정 시 등급 조합별 기본 카피. */
  ctaLabel?: string
}

/** 서버 마스킹이 필요한가 — 값이 DOM/응답에 남으면 우회되는가. */
export type MaskingRequirement = 'server' | 'display'

/**
 * 레지스트리 항목 (코드 SoT).
 *
 * `defaultPolicy` 는 **현재 배포된 실제 동작**이어야 한다. 기능을 새로
 * 잠글 때는 게이트 코드와 이 기본값을 같은 커밋에 넣는다(§원칙 2).
 * 반대로 `recommendedMinTier` 는 어드민 화면에만 표시되는 제안값이며
 * 런타임 판정에 일절 관여하지 않는다 — 카탈로그 조사 결과를 잃지 않으면서
 * 배포 시점에 사용자 화면이 바뀌지 않게 하는 분리다.
 */
export type FeatureDef = {
  /** 화면 표시용 한글 이름. 자유롭게 바꿔도 되지만 featureId 는 못 바꾼다. */
  label: string
  /** 소속 페이지 id. 같은 기능이 여러 라우트에 마운트되면 대표 페이지. */
  pageId: string
  /** 한 줄 설명. 어드민 표의 보조 텍스트. */
  description?: string
  /** 게이트를 실제로 거는 파일 경로(어드민에서 추적용). */
  location?: string
  /** 배포된 현재 동작. 행이 없을 때 이 값이 곧 정책이다. */
  defaultPolicy: { minTier: Tier; gateMode: GateMode; params?: GateParams }
  /** 카탈로그 조사가 제안한 등급. 표시 전용 — 판정에 쓰지 않는다. */
  recommendedMinTier?: Tier
  /** 카탈로그 조사가 제안한 게이트 방식. 표시 전용. */
  recommendedGateMode?: GateMode
  /** 이 기능이 지원하는 게이트 방식. 어드민 셀렉트가 이 목록으로 제한된다. */
  supportedGateModes?: readonly GateMode[]
  /** 서버 마스킹 필수 여부. `server` 인데 표시 게이트만 걸면 우회된다. */
  masking: MaskingRequirement
  /** 색인 대상 화면인가. true 인데 hidden/blur 를 고르면 어드민이 경고한다. */
  seoIndexed?: boolean
  /**
   * **이 기능의 화면·API 에 게이트가 실제로 배선되어 있는가.**
   *
   * 정책 저장은 언제나 즉시 반영되지만, 그 정책을 읽어 화면을 바꾸는 코드
   * (`FeatureGate` 마운트 + `masking: 'server'` 인 경우 API 마스킹)는 기능마다
   * 따로 넣어야 한다. 이 필드가 없는 기능은 어드민에서 무엇을 고르든 사용자
   * 화면이 바뀌지 않는다.
   *
   * 스위치를 돌렸는데 아무 일도 일어나지 않는 콘솔은 운영자를 한 번 속이면
   * 그 뒤로는 아무도 믿지 않는다. 그래서 배선 여부를 레지스트리가 들고 있고
   * 콘솔이 배지·배너로 드러낸다.
   *
   * 배선 커밋에서 이 값을 `true` 로 올린다 — 게이트 코드와 같은 커밋에 있어야
   * `defaultPolicy` 규약(§원칙 2)과 어긋나지 않는다.
   *
   * `admin.*` / `me.*` / 로그인 잠금 뉴스처럼 **기존 가드**(`requireAdmin`·
   * `requireUser`·`locked-section`)가 지키는 기능도 `false` 다. 그 가드들은
   * `feature_permissions` 를 읽지 않으므로, 콘솔에서 등급을 바꿔도 동작이
   * 달라지지 않는다는 점에서는 미배선과 같다.
   */
  wired?: boolean
  /** 더 이상 쓰지 않는 키. 삭제하지 않고 표시만 한다(감사 로그 참조 무결성). */
  retired?: boolean
}

/** 페이지 메타 — 어드민 좌측 리스트가 이 목록으로 그려진다. */
export type PageDef = {
  id: string
  label: string
  /** 대표 경로. 동적 세그먼트는 그대로 둔다 (`/stock/[ticker]`). */
  route: string
  /** 정렬 순서. 제품면 중요도 기준. */
  order: number
  /** 관리자 전용 라우트 — 기존 requireAdmin 이 지키므로 게이트 열이 없다. */
  adminOnly?: boolean
}

/**
 * 해석된 정책 — 레지스트리 기본값에 DB 오버라이드를 얹은 최종 결과.
 * 게이트 호출부가 보는 유일한 형태다.
 */
export type FeaturePolicy = {
  featureId: string
  minTier: Tier
  gateMode: GateMode
  params: GateParams
  /** 킬 스위치. false 면 등급과 무관하게 전면 차단(관리자 포함). */
  enabled: boolean
  /** DB 오버라이드가 존재하는가. 어드민에서 "기본값 되돌리기" 활성 조건. */
  overridden: boolean
}

/** DB 오버라이드 행 (feature_permissions). */
export type FeaturePermissionRow = {
  featureId: string
  minTier: Tier
  gateMode: GateMode
  params: GateParams
  enabled: boolean
  note: string | null
  updatedBy: string | null
  updatedAt: string
}

/**
 * 게이트 판정 결과. `FeatureGate` 와 서버 마스킹 헬퍼가 함께 쓴다.
 *
 * `allowed=true` 면 `gateMode` 는 항상 `'open'` 이다 — 등급을 충족했는데
 * 게이트가 남아 있는 상태는 표현 불가능하게 둔다.
 */
export type GateDecision = {
  featureId: string
  allowed: boolean
  gateMode: GateMode
  params: GateParams
  /** 이 기능을 열려면 필요한 등급. 업셀 카피가 이 값으로 결정된다. */
  requiredTier: Tier
  /** 판정에 쓰인 실제 등급. */
  actualTier: Tier
}

/**
 * 게이트가 걸린 리스트 응답의 공통 봉투.
 *
 * 서버가 `items` 에서 값을 이미 잘라 보내고, `lockedCount` 로 원래 몇 개가
 * 있었는지만 알린다. 클라이언트는 `lockedCount` 만큼 더미 행을 그려
 * 해제 전후 레이아웃 높이를 같게 유지한다(CLS 0).
 */
export type GatedList<T> = {
  items: T[]
  gated: boolean
  /** 마스킹되어 빠진 항목 수. 게이트가 없으면 0. */
  lockedCount: number
  gateMode: GateMode
  requiredTier: Tier
}

/** 정책 맵 — featureId → 해석된 정책. 서버가 한 번 만들어 트리에 내린다. */
export type PolicyMap = Record<string, FeaturePolicy>
