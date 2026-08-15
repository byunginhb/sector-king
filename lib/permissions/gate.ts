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
 *   1. 등급 충족(`hasTier`) → 통과.
 *   2. `gateMode === 'open'` → 통과. open 은 "게이트 없음"이라는 뜻이므로
 *      minTier 를 잘못 올려 둬도 화면이 잠기지 않는다.
 *   3. 그 외 → 차단 + 해당 gateMode 적용.
 *
 * 별도의 킬 스위치(`enabled`)는 두지 않는다. "전원 차단"은 최소 등급을
 * `admin` + `hidden` 으로 두면 그대로 표현되고, 스위치를 따로 두면 운영자가
 * 같은 결과를 두 가지 방법으로 만들 수 있어 "왜 잠겼는지"를 두 군데서
 * 확인해야 한다.
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

/**
 * `partial` 에서 `visibleRows` 미지정 시 실값으로 내보낼 건수.
 *
 * 0(전량 차단)이 아니라 3인 이유: `partial` 을 고른 운영자의 의도는 "일부는
 * 보여준다"이고, 파라미터를 비웠을 때 결과가 `hidden` 과 같아지면 셀렉트가
 * 거짓말을 한다. 전량 차단이 필요하면 `hidden` 이라는 이름이 이미 있다.
 */
export const PARTIAL_DEFAULT_VISIBLE_ROWS = 3

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

  // 1) 등급 충족 / 2) open 은 게이트 없음
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
      // 형상만 남기고 값은 전부 제거. 클라이언트가 그 자리에 무엇을 그릴지는
      // 표시 레이어의 몫이고, 서버 응답에는 값이 남지 않는다.
      return () => false

    case 'partial': {
      const visible =
        normalizeCount(params.visibleRows) ?? PARTIAL_DEFAULT_VISIBLE_ROWS
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
