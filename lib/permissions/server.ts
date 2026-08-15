/**
 * 게이팅 서버 진입점 — "지금 이 요청의 등급"과 "그 등급으로 이 기능이 열리는가".
 *
 * **서버 전용.** 클라이언트 컴포넌트는 이 모듈을 import 하지 않는다. 화면은
 * 서버가 계산해 내려준 `GateDecision`(또는 이미 마스킹된 데이터)만 받는다.
 * 판정을 클라이언트로 옮기는 순간 DevTools 로 뒤집을 수 있는 장식이 된다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  미리보기(preview) 오버라이드
 * ────────────────────────────────────────────────────────────────────
 *
 * 관리자가 "비로그인 사용자에게 이 화면이 어떻게 보이나"를 확인하려면 등급을
 * 낮춰 볼 수 있어야 한다. `PREVIEW_COOKIE` 로 그 값을 넘기되 **실제 프로필이
 * 관리자일 때만** 적용한다. 관리자가 아니면 쿠키를 조용히 무시한다 — 값을
 * 올려 쓰는 위조 시도가 성공하지 않으면서, 공격자에게 힌트도 주지 않는다.
 *
 * 이 오버라이드는 **표시 레이어 한정**이다. 쓰기 API·결제·관리자 API 는
 * 여전히 `role='admin'` 을 보므로, 미리보기 중에도 관리 권한은 그대로다.
 * (미리보기를 켠 채 잊는 사고는 쿠키 만료 30분이 해결한다.)
 */
import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'

import { getCurrentProfile, type CurrentProfile } from '@/lib/auth/get-user'

import { PREVIEW_COOKIE } from './constants'
import { decideGate } from './gate'
import { getPolicy, getPolicyMap } from './policy-store'
import { isTier, resolveTier, type Tier, type TierSubject } from './tier'
import type { GateDecision } from './types'

/**
 * `CurrentProfile` → `resolveTier` 입력.
 *
 * 구독 필드는 선택 필드다(브라우저 측 구성 지점·마이그레이션 미적용 창).
 * 없으면 `null` 로 접어 `free` 로 판정한다 — 위로 새지 않는 방향.
 */
export function toTierSubject(profile: CurrentProfile | null): TierSubject {
  if (!profile) return null
  return {
    role: profile.role,
    subscriptionTier: profile.subscriptionTier ?? null,
    subscriptionExpiresAt: profile.subscriptionExpiresAt ?? null,
  }
}

/** 미리보기 쿠키 값 — 관리자 검증은 호출부(`getViewerTier`)가 한다. */
async function readPreviewCookie(): Promise<Tier | null> {
  try {
    const store = await cookies()
    const raw = store.get(PREVIEW_COOKIE)?.value
    return raw && isTier(raw) ? raw : null
  } catch {
    // cookies() 를 못 읽는 컨텍스트(정적 렌더 등) — 미리보기는 없는 것으로.
    return null
  }
}

/**
 * 현재 요청의 판정용 등급.
 *
 * 실제 등급 = `resolveTier(profile)`. 관리자면 미리보기 쿠키가 이를 덮는다.
 * `cache()` 로 요청 내 1회만 계산한다(게이트마다 쿠키·프로필을 다시 읽지 않게).
 */
export const getViewerTier = cache(async (): Promise<Tier> => {
  const { tier } = await getViewerContext()
  return tier
})

/**
 * 등급 + 미리보기 상태.
 *
 * 미리보기 배너("지금 free 등급으로 보는 중")를 그리려면 화면이 실제 등급과
 * 표시 등급을 둘 다 알아야 한다.
 */
export const getViewerContext = cache(
  async (): Promise<{
    tier: Tier
    actualTier: Tier
    previewing: boolean
  }> => {
    const profile = await getCurrentProfile()
    const actualTier = resolveTier(toTierSubject(profile))

    // 관리자가 아니면 쿠키를 읽을 필요조차 없다.
    if (profile?.role !== 'admin') {
      return { tier: actualTier, actualTier, previewing: false }
    }

    const preview = await readPreviewCookie()
    if (!preview || preview === actualTier) {
      return { tier: actualTier, actualTier, previewing: false }
    }

    return { tier: preview, actualTier, previewing: true }
  }
)

/** 단일 기능 판정. 레지스트리에 없는 id 는 개방으로 해석된다(policy-store 참조). */
export async function getGateDecision(featureId: string): Promise<GateDecision> {
  const [policy, tier] = await Promise.all([getPolicy(featureId), getViewerTier()])
  return decideGate(policy, tier)
}

/**
 * 전체 기능 × 현재 등급 판정 맵.
 *
 * 레이아웃이 한 번 계산해 클라이언트 프로바이더에 내리는 값이다. 기능마다
 * 개별 호출하면 같은 정책 맵을 두고 판정만 반복하게 되므로, 한 번에 접는다.
 * 정책 맵과 등급이 모두 요청 캐시라 실제 I/O 는 요청당 각각 1회다.
 */
export const getGateDecisionMap = cache(
  async (): Promise<Record<string, GateDecision>> => {
    const [policies, tier] = await Promise.all([getPolicyMap(), getViewerTier()])
    const map: Record<string, GateDecision> = {}
    for (const [featureId, policy] of Object.entries(policies)) {
      map[featureId] = decideGate(policy, tier)
    }
    return map
  }
)

/** 편의 헬퍼 — 조건 분기만 필요한 호출부용. */
export async function canAccess(featureId: string): Promise<boolean> {
  const decision = await getGateDecision(featureId)
  return decision.allowed
}
