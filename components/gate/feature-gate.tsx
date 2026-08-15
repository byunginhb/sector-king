'use client'

/**
 * `<FeatureGate>` — 기능 하나를 등급에 따라 숨기거나 축약하는 표시 레이어.
 *
 * 게이트는 세 가지뿐이다(`lib/permissions/types.ts`):
 *
 *   보임(open)    래퍼조차 씌우지 않는다
 *   일부(partial) 서버가 이미 잘라 보낸 축약 콘텐츠 + 안내 스트립
 *   숨김(hidden)  아무것도 렌더하지 않는다(`fallback` 지정 시 그것만)
 *
 * ────────────────────────────────────────────────────────────────────
 *  흐림은 보안이 아니다 (이 컴포넌트의 전제)
 * ────────────────────────────────────────────────────────────────────
 *
 * CSS `filter: blur()` 는 DevTools 한 줄로 벗겨지고, 벗기지 않아도 네트워크 탭에
 * 원본이 그대로 남는다. 그래서 **게이트된 실제 값은 API 응답에도 DOM 에도 담기지
 * 않는다.** 서버가 값을 지우고 `lockedCount` 만 내려준다. 가려진 구간에 흐린
 * 더미 형상을 그리는 시각 처리는 리스트/표 전용인 `<PartialGate>` 가 맡는다 —
 * 여기로 들어오는 partial 은 이미 잘려 있으므로 안내만 붙이면 된다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  CLS
 * ────────────────────────────────────────────────────────────────────
 *
 * 컨테이너에 `min-h` 를 강제로 주지 않는다 — 그 자체가 레이아웃 변경이다.
 * 판정은 서버에서 끝나므로(`GateProvider` 주석 참조) 하이드레이션 전후로 게이트
 * 유무가 바뀌지 않는다.
 */

import { cn } from '@/lib/utils'
import { GATED_ROOT_CLASS } from '@/lib/permissions/constants'
import type { GateDecision } from '@/lib/permissions/types'
import { useGate } from './gate-provider'
import { GateNotice } from './upsell-overlay'

/** 흐림 강도 보정 — globals.css 의 `--sk-gate-blur-{sm,lg}` 토큰과 대응. */
export type GateBlurScale = 'sm' | 'md' | 'lg'

export type FeatureGateProps = {
  featureId: string
  /**
   * 컨텍스트 대신 직접 주입하는 판정. 서버 컴포넌트에서 `getGateDecision()` 결과를
   * 넘기거나, 테스트에서 특정 상태를 재현할 때 쓴다. 주어지면 컨텍스트보다 우선.
   */
  decision?: GateDecision
  /** 기능별 업셀 본문. 미지정 시 등급별 기본 카피. */
  message?: string
  /** `hidden` 게이트에서 대신 렌더할 내용. 기본은 **아무것도 렌더하지 않음**. */
  fallback?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function FeatureGate({
  featureId,
  decision: decisionProp,
  message,
  fallback,
  className,
  children,
}: FeatureGateProps) {
  const contextDecision = useGate(featureId)
  const decision = decisionProp ?? contextDecision

  // 등급 충족 — 래퍼조차 씌우지 않는다. 게이트가 없는 화면에 `.sk-gated` 가 남으면
  // 페이월 구조화 데이터가 거짓 신고가 된다(§SEO 원칙 4).
  if (decision.allowed || decision.gateMode === 'open') {
    return <>{children}</>
  }

  // 완전 제거. 자리표시자를 두지 않는다 — 없는 걸 계속 광고하면 화면이 업셀
  // 격자가 된다. 자리표시자를 두고 싶어졌다면 그건 숨김이 잘못된 선택이라는
  // 신호이고, 일부(partial) 로 바꿔야 한다는 뜻이다.
  if (decision.gateMode === 'hidden') {
    return <>{fallback ?? null}</>
  }

  // 일부 — 축약된 **실제** 콘텐츠 + 안내 스트립. 셀 단위 흐림은 `<PartialGate>`.
  return (
    <div
      className={cn(GATED_ROOT_CLASS, className)}
      data-gate={decision.gateMode}
      data-feature={featureId}
    >
      {children}
      <GateNotice decision={decision} message={message} className="mt-3" />
    </div>
  )
}

/**
 * 가려진 자리에 그릴 더미 형상 — 자릿수·행수만 맞춘 고정 문자열.
 * `<PartialGate>` 의 `maskedSlot` 에 넣어 쓴다.
 *
 * 실제 값에서 파생하지 않는다. 값에서 파생하면(자릿수를 실값에 맞추는 식)
 * 흐림 너머로 크기 정보가 새고, 그 순간 "서버가 값을 지운다" 는 전제가 무너진다.
 */
export function GatePlaceholderRows({
  rows,
  className,
}: {
  rows: number
  className?: string
}) {
  const count = Math.max(0, Math.min(rows, 50))
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border-subtle/60 py-2 last:border-b-0"
        >
          <span className="w-6 font-mono text-xs tabular-nums text-muted-foreground">
            {i + 1}
          </span>
          <span className="flex-1 text-sm text-foreground/70">━━━━━━━</span>
          <span className="font-mono text-sm tabular-nums text-foreground/70">
            1,234.56
          </span>
        </div>
      ))}
    </div>
  )
}
