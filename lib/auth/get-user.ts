/**
 * Server Component / Route Handler 용 인증 헬퍼.
 *
 * `getCurrentUser()` — auth.users 의 user 만 (가벼움)
 * `getCurrentProfile()` — profiles 행 + role + 구독 등급까지 조회
 *
 * 사용 예:
 *   // app/some/page.tsx
 *   const profile = await getCurrentProfile()
 *   if (profile?.role === 'admin') { ... }
 *
 * 주의: RLS 가 적용된 `profiles_self_select` 정책에 따라 본인 행만 반환.
 * 미인증이면 null 반환.
 *
 * ────────────────────────────────────────────────────────────────────
 *  `react.cache` 로 감싼 이유 (게이팅 도입의 전제 조건)
 * ────────────────────────────────────────────────────────────────────
 * 게이트가 걸린 페이지는 한 요청에서 프로필을 여러 번 읽는다(레이아웃 1회 +
 * 게이트마다 1회). 감싸지 않으면 `auth.getUser()` 의 토큰 검증 + profiles
 * 조회가 **게이트 수만큼 선형으로** 늘어난다. 같은 저장소의 `lib/site-facts.ts`,
 * `lib/seo-snapshot.ts`, `lib/sector-server.ts` 는 이미 전부 `cache()` 를 쓴다.
 *
 * `cache()` 는 요청 단위 메모이제이션이라 사용자 간 누수가 없다. 사용자별
 * 데이터를 Data Cache(`unstable_cache`)에 넣으면 안 되는 것과는 다른 층이다.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { StorableTier } from '@/lib/permissions/tier'
import { isStorableTier } from '@/lib/permissions/tier'

export type CurrentProfile = {
  id: string
  /**
   * **null 일 수 있다.** 네이버처럼 이메일을 안 넘기는 제공자, 그리고 카카오의
   * account_email(선택 동의)을 거부한 사용자가 여기에 해당한다. 0017 이전에는
   * profiles.email 이 NOT NULL 이라 그런 가입이 통째로 실패했다.
   */
  email: string | null
  name: string | null
  avatarUrl: string | null
  role: 'user' | 'admin'
  /**
   * 구독 등급. **선택 필드다** — 브라우저 측 세션 조회처럼 구독 컬럼을 뽑지
   * 않는 구성 지점이 있고, 0014 마이그레이션 적용 전에는 컬럼 자체가 없다.
   * 게이트 판정은 `undefined`/`null` 을 `free` 로 접는다(fail-safe).
   * 관리자 여부는 이 값이 아니라 `role` 이 SoT (tier.ts §3).
   */
  subscriptionTier?: StorableTier | null
  /** ISO 8601 절대시각. null = 만료 없음(무료 등급이거나 영구 부여). */
  subscriptionExpiresAt?: string | null
}

/** 구독 컬럼 포함 조회. 마이그레이션 적용 후의 정상 경로. */
const PROFILE_COLUMNS_FULL =
  'id, email, name, avatar_url, role, subscription_tier, subscription_expires_at'

/** 0014 적용 전 폴백 조회. 이 경로에서도 로그인은 정상 동작해야 한다. */
const PROFILE_COLUMNS_BASE = 'id, email, name, avatar_url, role'

/** 경고 1회만 — 마이그레이션 미적용 창에서 로그가 쏟아지지 않게. */
let warnedMissingSubscriptionColumns = false

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const full = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS_FULL)
      .eq('id', user.id)
      .single()

    let data = full.data as Record<string, unknown> | null

    if (full.error || !data) {
      // 구독 컬럼이 아직 없는 창(0014 미적용)이면 기본 컬럼으로 재시도한다.
      // 여기서 폴백하지 않으면 마이그레이션 적용 전까지 로그인 자체가 깨진다.
      const base = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS_BASE)
        .eq('id', user.id)
        .single()

      if (base.data) {
        if (!warnedMissingSubscriptionColumns) {
          warnedMissingSubscriptionColumns = true
          console.warn(
            '[auth] profiles 구독 컬럼 조회 실패 — 기본 컬럼으로 폴백했습니다(0014 마이그레이션 미적용 가능).',
            full.error?.message
          )
        }
        data = base.data as Record<string, unknown>
      } else {
        // 트리거가 아직 실행되지 않은 케이스 등 — auth 사용자 정보로 폴백
        return {
          id: user.id,
          email: user.email ?? null,
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            null,
          avatarUrl:
            (user.user_metadata?.avatar_url as string | undefined) ?? null,
          role: 'user',
          subscriptionTier: 'free',
          subscriptionExpiresAt: null,
        }
      }
    }

    const rawTier = data.subscription_tier
    const rawExpires = data.subscription_expires_at

    return {
      id: data.id as string,
      email: (data.email as string | null) ?? null,
      name: (data.name as string | null) ?? null,
      avatarUrl: (data.avatar_url as string | null) ?? null,
      role: data.role === 'admin' ? 'admin' : 'user',
      // 알 수 없는 등급 문자열은 null 로 접는다 → resolveTier 가 'free' 로 판정.
      subscriptionTier: isStorableTier(rawTier) ? rawTier : null,
      subscriptionExpiresAt:
        typeof rawExpires === 'string' && rawExpires.length > 0
          ? rawExpires
          : null,
    }
  }
)
