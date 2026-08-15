/**
 * 구독 등급 사다리 단일 SoT (Single Source of Truth)
 *
 * ────────────────────────────────────────────────────────────────────
 *  등급 규약 (반드시 준수)
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. **등급은 순서가 있는 단조 사다리다.** `anon(0) < free(10) < basic(20) <
 *    pro(30) < admin(100)`. 게이트 판정은 언제나 `hasTier(actual, required)`
 *    한 줄이며, 등급별 if 분기를 게이트 호출부에 흩뿌리지 않는다.
 *
 * 2. **10 단위 간격은 의도다.** 중간 등급(`plus`=25 등)을 나중에 끼워 넣을 때
 *    기존 값을 재번호하지 않기 위함. 재번호하면 이미 DB 에 저장된
 *    `feature_permissions.min_tier` 의 의미가 통째로 바뀐다.
 *
 * 3. **관리자는 별도 축(`profiles.role`)이 SoT 이고 사다리에는 파생값으로만
 *    등장한다.** `profiles.subscription_tier` 에 `'admin'` 저장은 DB CHECK 로
 *    차단된다. 근거:
 *    - RLS 정책 15개 이상이 이미 `is_admin()`(=role)에 걸려 있어, 두 번째 원천을
 *      만들면 `role='user' + tier='admin'` 같은 어긋난 상태에 정답이 없다.
 *    - 구독은 만료로 강등되지만 운영 권한에 만료를 적용할 수 없다.
 *    - 부여 파이프라인이 다르다 (가입 시 화이트리스트 vs 결제 웹훅).
 *      같은 컬럼이면 결제 웹훅이 관리자를 강등시킨다.
 *
 * 4. **알 수 없는 값은 차단(fail-safe)이다.** `TIER_RANK[unknown]` 은
 *    `undefined` 이고, `undefined >= n` 은 false 이므로 오타난 등급은
 *    전면 개방이 아니라 전면 차단으로 떨어진다. 0 을 반환하면 정반대가 된다.
 *
 * 5. **만료 강등은 읽기 시점 파생 계산이 SoT 다.** 배치(`expire_subscriptions()`)는
 *    표시·집계 정합성용이며, 게이트의 정확성이 배치 실행 여부에 걸리지 않는다.
 *    (배치 결번 이력: CLAUDE.md 2026-08-08 "최근 10일 중 3일 결번")
 *
 * SQL 측 동등 함수: `public.tier_rank()`, `public.effective_tier()`
 * (`supabase/migrations/0014_feature_permissions.sql`). 두 구현의 규칙이
 * 어긋나면 RLS 와 앱 게이트가 다른 답을 낸다 — 한쪽만 고치지 말 것.
 */

/** 등급 값. 저장되는 것은 `free|basic|pro` 뿐이고 `anon`·`admin` 은 파생값이다. */
export type Tier = 'anon' | 'free' | 'basic' | 'pro' | 'admin'

/** 사다리 순위. 값 간 간격 10 은 중간 등급 삽입 여지다 (§2). */
export const TIER_RANK: Record<Tier, number> = {
  anon: 0,
  free: 10,
  basic: 20,
  pro: 30,
  admin: 100,
}

/** 사다리 오름차순. UI 의 등급 열·세그먼트 순서가 이 배열을 따른다. */
export const TIER_ORDER: readonly Tier[] = ['anon', 'free', 'basic', 'pro', 'admin']

/** `profiles.subscription_tier` 에 저장 가능한 값 (DB CHECK 와 동일 도메인). */
export const STORABLE_TIERS = ['free', 'basic', 'pro'] as const
export type StorableTier = (typeof STORABLE_TIERS)[number]

/** 화면 표기용 한글 라벨. */
export const TIER_LABEL: Record<Tier, string> = {
  anon: '비로그인',
  free: '미구독',
  basic: '일반구독',
  pro: 'Pro구독',
  admin: '관리자',
}

/** 등급 값 여부 (런타임 경계 검증용). */
export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && value in TIER_RANK
}

/** 저장 가능한 등급 여부. */
export function isStorableTier(value: unknown): value is StorableTier {
  return (
    typeof value === 'string' &&
    (STORABLE_TIERS as readonly string[]).includes(value)
  )
}

/**
 * 등급 비교 — `actual` 이 `required` 이상인가.
 *
 * 알 수 없는 값은 rank 가 `undefined` 라 비교가 false 로 떨어진다(§4).
 * 이 함수가 게이트 판정의 유일한 비교 지점이다.
 */
export function hasTier(actual: Tier, required: Tier): boolean {
  const a = TIER_RANK[actual]
  const r = TIER_RANK[required]
  if (a === undefined || r === undefined) return false
  return a >= r
}

/** `resolveTier` 입력 — `CurrentProfile` 의 부분집합만 요구한다(순수 함수 유지). */
export type TierSubject = {
  role: 'user' | 'admin'
  subscriptionTier: StorableTier | null
  subscriptionExpiresAt: string | null
} | null

/**
 * 저장된 두 축(role, subscription)을 판정용 한 축으로 접는다.
 *
 * 우선순위:
 *   1. 프로필 없음               → 'anon'
 *   2. role === 'admin'          → 'admin'  (만료 무관 — 별도 축이므로)
 *   3. 만료일이 지났음            → 'free'   (읽기 시점 강등)
 *   4. 그 외                     → subscription_tier
 *
 * SQL `public.effective_tier(uuid)` 와 규칙이 1:1 로 같아야 한다.
 *
 * @param now 비교 기준 시각. 테스트에서 주입하기 위해 인자로 열어 둔다.
 */
export function resolveTier(subject: TierSubject, now: Date = new Date()): Tier {
  if (!subject) return 'anon'
  if (subject.role === 'admin') return 'admin'

  const stored = subject.subscriptionTier
  if (!isStorableTier(stored)) return 'free'
  if (stored === 'free') return 'free'

  const expiresAt = subject.subscriptionExpiresAt
  if (expiresAt) {
    const t = Date.parse(expiresAt)
    // 파싱 불가한 만료일은 "만료됨" 으로 본다 — fail-safe(§4).
    if (Number.isNaN(t) || t <= now.getTime()) return 'free'
  }

  return stored
}
