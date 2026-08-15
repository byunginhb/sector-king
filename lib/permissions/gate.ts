/**
 * 게이트 판정 + 서버 마스킹 — **순수 함수만.**
 *
 * 이 파일은 서버(API 라우트·RSC)와 클라이언트(게이트 컴포넌트) 양쪽에서
 * import 된다. `next/headers`·`server-only`·Supabase 등 서버 전용 모듈을
 * 절대 import 하지 않는다. 부수효과도 없다 — 그래야 유닛 테스트가
 * 목(mock) 없이 전 분기를 덮는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  판정 순서 (이 순서가 곧 사양이다)
 * ────────────────────────────────────────────────────────────────────
 *
 *   1. `enabled === false`  → 전면 차단. **관리자도 예외가 아니다.**
 *      킬 스위치의 목적이 "지금 이 화면이 틀린 값을 보여준다"인데 관리자만
 *      통과시키면 "관리자 화면에선 멀쩡한데요"라는 오진이 나온다.
 *      (어드민 콘솔 `/admin/features` 자체는 게이트 대상이 아니라서
 *       관리자는 언제나 정책과 상태를 확인할 수 있다.)
 *   2. 등급 충족(`hasTier`) → 통과.
 *   3. `gateMode === 'open'` → 통과. open 은 "게이트 없음"이라는 뜻이므로
 *      minTier 를 잘못 올려 둬도 화면이 잠기지 않는다.
 *   4. 그 외 → 차단 + 해당 gateMode 적용.
 *
 * ────────────────────────────────────────────────────────────────────
 *  마스킹 원칙
 * ────────────────────────────────────────────────────────────────────
 *
 * `maskList` 는 **응답에서 값을 실제로 지운다.** CSS blur 나 클라이언트 slice
 * 는 DevTools 로 벗겨지고 네트워크 탭에 원본이 그대로 남는다. `visibleRows`
 * 는 "서버가 몇 개를 실값으로 보낼지"이지 CSS 값이 아니다.
 *
 * `maskFn` 을 주면 제거 대신 **자릿수만 맞춘 더미로 치환**한다. 항목 수가
 * 유지되므로 클라이언트가 해제 전후 레이아웃 높이를 같게 그릴 수 있다(CLS 0).
 * 더미 값은 원본에서 파생되면 안 된다 — 그러면 지운 의미가 없다.
 */

import { LOGIN_HREF, UPGRADE_HREF } from './constants'
import { hasTier, type Tier } from './tier'
import type {
  FeaturePolicy,
  GateDecision,
  GateMode,
  GateParams,
  GatedList,
} from './types'

/** `teaser` 에서 visibleRows 미지정 시 노출 건수. */
export const TEASER_DEFAULT_VISIBLE_ROWS = 1

/**
 * 정책 × 등급 → 판정.
 *
 * `allowed === true` 면 `gateMode` 는 항상 `'open'` 이다. 등급을 충족했는데
 * 게이트가 남아 있는 상태를 표현 불가능하게 두면, 호출부가
 * `if (decision.allowed)` 만 보고도 안전해진다.
 */
export function decideGate(policy: FeaturePolicy, tier: Tier): GateDecision {
  const base = {
    featureId: policy.featureId,
    params: policy.params ?? {},
    requiredTier: policy.minTier,
    actualTier: tier,
  }

  // 1) 킬 스위치 — 등급 비교 이전. 관리자 포함 전원 차단.
  if (policy.enabled === false) {
    return { ...base, allowed: false, gateMode: 'hidden' }
  }

  // 2) 등급 충족 / 3) open 은 게이트 없음
  if (hasTier(tier, policy.minTier) || policy.gateMode === 'open') {
    return { ...base, allowed: true, gateMode: 'open' }
  }

  // 4) 차단
  return { ...base, allowed: false, gateMode: policy.gateMode }
}

/** 유한한 0 이상 정수만 통과. 그 외(NaN·음수·소수·undefined)는 null. */
function normalizeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const n = Math.floor(value)
  return n >= 0 ? n : null
}

/**
 * "i 번째 항목이 실값으로 나가는가" 판정기.
 *
 * 값이 이상하면(파라미터 누락·음수·NaN) **차단 쪽으로 떨어진다.** 정책 오타가
 * 유료 데이터 유출로 이어지지 않게 하는 fail-close 지점이다.
 */
function visibilityPredicate(
  gateMode: GateMode,
  params: GateParams
): (index: number) => boolean {
  switch (gateMode) {
    case 'open':
      return () => true

    case 'hidden':
    case 'blur':
      // 형상만 남기고 값은 전부 제거. blur 는 "흐리게 보여준다"가 아니라
      // "서버가 지운 자리에 클라이언트가 흐림 효과를 그린다"는 뜻이다.
      return () => false

    case 'partial': {
      // blurTopK 가 visibleRows 보다 우선한다(둘 다 지정 시 규약).
      const topK = normalizeCount(params.blurTopK)
      if (topK !== null) return (i) => i >= topK
      const visible = normalizeCount(params.visibleRows) ?? 0
      return (i) => i < visible
    }

    case 'teaser': {
      const visible =
        normalizeCount(params.visibleRows) ?? TEASER_DEFAULT_VISIBLE_ROWS
      return (i) => i < visible
    }

    default:
      // 알 수 없는 모드 = 전면 차단(fail-close).
      return () => false
  }
}

/**
 * 리스트에 게이트를 적용한다.
 *
 * @param items    원본 배열 (서버가 이미 조회한 실값)
 * @param decision `decideGate` 결과
 * @param maskFn   주어지면 제거 대신 더미로 치환(형상 유지). 원본 값을
 *                 재사용하지 말 것 — 그러면 마스킹이 아니다.
 *
 * `lockedCount` 는 **가려진 항목 수**다. 제거 방식이든 더미 치환 방식이든
 * 같은 값이라, 클라이언트 문구("N건 더 보기")가 방식에 따라 달라지지 않는다.
 */
export function maskList<T>(
  items: T[],
  decision: GateDecision,
  maskFn?: (item: T, index: number) => T
): GatedList<T> {
  const source = Array.isArray(items) ? items : []

  if (decision.allowed) {
    return {
      items: source,
      gated: false,
      lockedCount: 0,
      gateMode: 'open',
      requiredTier: decision.requiredTier,
    }
  }

  const isVisible = visibilityPredicate(decision.gateMode, decision.params ?? {})
  const kept: T[] = []
  let lockedCount = 0

  source.forEach((item, index) => {
    if (isVisible(index)) {
      kept.push(item)
      return
    }
    lockedCount += 1
    if (maskFn) kept.push(maskFn(item, index))
  })

  return {
    items: kept,
    gated: true,
    lockedCount,
    gateMode: decision.gateMode,
    requiredTier: decision.requiredTier,
  }
}

/**
 * 단일 값 마스킹 — 리스트가 아닌 스칼라/객체 필드용.
 *
 * 허용이면 실값, 차단이면 `fallback`(기본 null). `maskList` 와 같은 원칙:
 * 응답에서 값이 실제로 사라진다.
 */
export function maskValue<T, F = null>(
  value: T,
  decision: GateDecision,
  fallback?: F
): T | F {
  if (decision.allowed) return value
  return (fallback ?? null) as F
}

/**
 * 업셀 CTA 착지점.
 *
 * - `params.ctaHref` 가 있으면 그것이 최우선(기능별 전용 랜딩).
 * - 필요한 등급이 `free` 이하 → 로그인만 하면 열린다 → `LOGIN_HREF`.
 * - 그 이상(`basic`/`pro`/`admin`) → 결제가 필요하다 → `UPGRADE_HREF`.
 */
export function resolveCtaHref(decision: GateDecision): string {
  const custom = decision.params?.ctaHref
  if (typeof custom === 'string' && custom.length > 0) return custom
  return decision.requiredTier === 'anon' || decision.requiredTier === 'free'
    ? LOGIN_HREF
    : UPGRADE_HREF
}
