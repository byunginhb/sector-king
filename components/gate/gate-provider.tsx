'use client'

/**
 * 게이트 컨텍스트 — 정책 맵(서버 주입) × 뷰어 등급(클라이언트 확정)을 합쳐
 * 트리 전체에 판정을 내린다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 등급을 클라이언트에서 확정하는가
 * ────────────────────────────────────────────────────────────────────
 *
 * 루트 레이아웃이 쿠키를 읽으면 그 아래 **모든 라우트가 동적 렌더로 떨어진다**
 * (실측: 페이지 프리렌더 30 → 0. `app/layout.tsx` 주석 참조). `/sectors/[sectorId]`
 * 109개 SSG 와 `/rankings` 의 ISR 이 통째로 사라진다.
 *
 * 그래서 서버는 **사용자와 무관한 정책 맵**만 내리고, 등급은 여기서 확정한다.
 * 이 방향이 안전한 이유는 하나뿐이다 — **잠금 해제 방향으로만 움직이기 때문**이다.
 *
 *   서버 HTML: 항상 `anon` = 가장 잠긴 상태
 *   클라이언트: 세션 확인 후 등급이 높으면 **풀어준다**
 *
 * 기획서 §B-3 이 경고한 CLS·유출 경로는 정확히 **반대 방향**(유료 콘텐츠를 먼저
 * 보여줬다가 뒤늦게 감추기)이었다. 그 방향은 이 구조에서 발생할 수 없다.
 *
 * 게다가 값의 실제 보호는 **서버 마스킹**이 한다(`FeatureDef.masking === 'server'`).
 * 잠긴 값은 애초에 이 트리까지 오지 않으므로, 등급을 늦게 알아도 유출될 값이 없다.
 * `components/auth/auth-button-client.tsx` 가 이미 같은 패턴을 쓴다 — 정적 HTML 은
 * 비로그인 기준, 개인화는 세션 확인 후.
 *
 * ────────────────────────────────────────────────────────────────────
 *  이 컨텍스트는 보안 경계가 아니다
 * ────────────────────────────────────────────────────────────────────
 *
 * 여기 담기는 것은 "무엇을 어떻게 보여줄지"뿐이다. 그래서 등록되지 않은
 * featureId 에 대해 fail-open 할 수 있다 — `useGate` 주석 참조.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { decideGate } from '@/lib/permissions/gate'
import { resolveTier, type Tier } from '@/lib/permissions/tier'
import { PREVIEW_COOKIE } from '@/lib/permissions/constants'
import { isTier } from '@/lib/permissions/tier'
import type { GateDecision, PolicyMap } from '@/lib/permissions/types'

export type GateContextValue = {
  /** featureId → 현재 등급 기준 판정. */
  decisions: Record<string, GateDecision>
  /** 판정에 쓰인 등급(미리보기 중이면 미리보기 등급). */
  tier: Tier
}

const EMPTY_DECISIONS: Record<string, GateDecision> = {}

/**
 * Provider 가 없을 때의 값. `anon` + 빈 맵.
 *
 * 빈 맵이므로 모든 `useGate` 가 fail-open 폴백으로 떨어진다. Provider 를 빼먹은
 * 트리(테스트·스토리북)에서 화면이 통째로 잠기는 대신 그대로 보인다.
 */
const GateContext = createContext<GateContextValue>({
  decisions: EMPTY_DECISIONS,
  tier: 'anon',
})

export type GateProviderProps = {
  /** 서버 컴포넌트에서 `getPolicyMap()` 으로 만든 정책 맵(사용자 무관). */
  policies: PolicyMap
  /**
   * 서버가 이미 등급을 알고 있는 트리에서의 오버라이드.
   *
   * `force-dynamic` 라우트(`/admin`, `/me`, `/analysts` 등)는 어차피 쿠키를 읽으므로
   * `getViewerTier()` 결과를 넘겨 첫 렌더부터 확정 등급으로 그릴 수 있다. 정적
   * 라우트에서는 넘기지 말 것 — 넘기는 순간 그 라우트가 동적으로 떨어진다.
   */
  serverTier?: Tier
  children: React.ReactNode
}

/** 미리보기 쿠키 읽기. httpOnly 가 아니라서 클라이언트에서 읽을 수 있다. */
function readPreviewTier(): Tier | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${PREVIEW_COOKIE}=`))
    ?.slice(PREVIEW_COOKIE.length + 1)
  if (!raw) return null
  const value = decodeURIComponent(raw)
  return isTier(value) ? value : null
}

/**
 * 정책 맵에 **실제로 잠긴 기능이 하나라도 있는가.**
 *
 * 전부 `open` 이거나 `minTier: 'anon'` 이면 어떤 등급으로 판정해도 결과가 같다.
 * 그럴 때는 세션 조회 자체를 건너뛴다 — 게이트를 아직 켜지 않은 상태에서
 * 모든 방문자에게 Supabase 왕복을 시키지 않기 위함이다.
 *
 * 이 판단의 근거가 **정책 맵 자신**이라는 점이 중요하다. DB 오버라이드가 이미
 * 병합된 뒤의 값이므로, 운영자가 어드민에서 무언가를 잠그는 순간 이 값이
 * 자동으로 true 가 되고 세션 조회가 켜진다. 코드 배포가 필요 없고, 잠긴 기능을
 * 조용히 통과시키는 구멍도 생기지 않는다.
 */
function hasAnyGate(policies: PolicyMap): boolean {
  for (const policy of Object.values(policies)) {
    if (policy.gateMode === 'open') continue
    if (policy.minTier !== 'anon') return true
  }
  return false
}

export function GateProvider({
  policies,
  serverTier,
  children,
}: GateProviderProps) {
  const gated = useMemo(() => hasAnyGate(policies), [policies])

  // 서버가 등급을 확정해 줬거나 잠긴 기능이 없으면 조회하지 않는다.
  const needsLookup = serverTier === undefined && gated

  const [resolvedTier, setResolvedTier] = useState<Tier | null>(null)

  useEffect(() => {
    if (!needsLookup) return
    let cancelled = false

    async function resolve() {
      // 미리보기 쿠키는 서버가 관리자에게만 심어 준다(`/api/preview-tier`).
      // 여기서 신뢰해도 되는 이유: 표시 레이어일 뿐이고, 값의 보호는 서버
      // 마스킹이 한다. 쿠키를 위조해도 잠긴 데이터는 응답에 오지 않는다.
      const preview = readPreviewTier()
      if (preview) {
        if (!cancelled) setResolvedTier(preview)
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          setResolvedTier('anon')
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('role, subscription_tier, subscription_expires_at')
          .eq('id', user.id)
          .single()
        if (cancelled) return

        setResolvedTier(
          resolveTier(
            data
              ? {
                  role: data.role === 'admin' ? 'admin' : 'user',
                  subscriptionTier: data.subscription_tier ?? 'free',
                  subscriptionExpiresAt: data.subscription_expires_at ?? null,
                }
              : // 프로필 행이 아직 없는 신규 가입자 — 로그인은 했으므로 free.
                { role: 'user', subscriptionTier: 'free', subscriptionExpiresAt: null }
          )
        )
      } catch {
        // 조회 실패는 승급 실패로 끝난다(anon 유지). 열리는 방향이 아니라
        // 잠긴 채로 남는 방향이므로 유출이 아니다.
        if (!cancelled) setResolvedTier('anon')
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [needsLookup])

  const tier: Tier = serverTier ?? resolvedTier ?? 'anon'

  const value = useMemo<GateContextValue>(() => {
    const decisions: Record<string, GateDecision> = {}
    for (const [featureId, policy] of Object.entries(policies)) {
      decisions[featureId] = decideGate(policy, tier)
    }
    return { decisions, tier }
  }, [policies, tier])

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>
}

/**
 * 판정 조회. 등록되지 않은 featureId 는 **열림으로 폴백**한다.
 *
 * 폴백 방향을 이렇게 잡은 근거:
 * - 이 레이어는 표시 전용이고, 값의 보호는 서버 마스킹이 이미 끝냈다.
 *   서버가 값을 지웠다면 fail-open 이어도 빈 자리가 보일 뿐 유출이 아니다.
 * - 반대로 fail-closed 로 두면 featureId 오타 하나가 **공개 콘텐츠 위에 가짜
 *   페이월**을 씌운다. 그러면 `.sk-gated` 를 근거로 붙는 구조화 데이터
 *   (`isAccessibleForFree: false`)까지 거짓 신고가 된다.
 * - `lib/permissions/tier.ts` 의 fail-safe 차단 원칙은 **등급 비교**(`hasTier`)에
 *   적용되는 규칙이고, 그 비교는 `decideGate` 안에서 이미 수행됐다. 여기는
 *   그 결과를 조회하는 자리라 규칙의 적용 지점이 아니다.
 */
export function useGate(featureId: string): GateDecision {
  const { decisions, tier } = useContext(GateContext)
  const found = decisions[featureId]
  if (found) return found

  return {
    featureId,
    allowed: true,
    gateMode: 'open',
    params: {},
    requiredTier: 'anon',
    actualTier: tier,
  }
}

/** 현재 뷰어 등급. 업셀 카피·미리보기 표시가 참조한다. */
export function useViewerTier(): Tier {
  return useContext(GateContext).tier
}
