'use client'

/**
 * `<FeatureGate>` — 기능 하나를 등급에 따라 흐리게/숨김 처리하는 표시 레이어.
 *
 * ────────────────────────────────────────────────────────────────────
 *  1. blur 는 보안이 아니다 (이 컴포넌트의 전제)
 * ────────────────────────────────────────────────────────────────────
 *
 * CSS `filter: blur()` 는 DevTools 한 줄로 벗겨지고, 벗기지 않아도 네트워크 탭에
 * 원본이 그대로 남는다. 그래서 **게이트된 실제 값은 API 응답에도 DOM 에도 담기지
 * 않는다.** 서버가 이미 값을 지우고 `lockedCount` 만 내려주며, 이 컴포넌트는
 * 자릿수·행수만 맞춘 **더미 형상**을 그려 흐리게 만든다.
 *
 * 부수 효과 3가지가 전부 여기서 나온다:
 *   ① 실제 값 유출 0
 *   ② 더미에는 링크·버튼이 없으므로 포커스 트랩 문제가 애초에 생기지 않는다
 *   ③ 더미 행 수를 실제 행 수에 맞추면 구독 해제 전후 높이가 같아 CLS 0
 *
 * `children` 을 그대로 흐리는 폴백 경로가 있지만, 이는 **서버가 이미 값을 지웠을
 * 때만** 안전하다. 실값이 들어 있는 children 을 blur 게이트에 넣으면 그 순간
 * 유료 콘텐츠가 무료로 새는 것과 같다 — `lockedCount` 또는 `placeholder` 를 써라.
 *
 * ────────────────────────────────────────────────────────────────────
 *  2. 베일에 세 가지를 전부 건다
 * ────────────────────────────────────────────────────────────────────
 *
 *   `aria-hidden`        만 걸면 포커스는 그대로 들어간다
 *   `inert`              만 걸면 일부 스크린리더가 여전히 읽는다
 *   `pointer-events-none` inert 미지원 브라우저의 폴백
 *
 * 하나씩은 각각 구멍이 있어서 셋 다 필요하다. 그리고 오버레이는 이 베일 **밖**에
 * 있어야 한다 — 잠긴 이유와 CTA 가 접근성 트리에 남는 유일한 내용이기 때문.
 *
 * ────────────────────────────────────────────────────────────────────
 *  3. CLS
 * ────────────────────────────────────────────────────────────────────
 *
 * 베일은 정상 문서 흐름을 유지하고 오버레이만 `absolute inset-0` 이라 높이 기여가
 * 0 이다. 컨테이너에 `min-h` 를 강제로 주지 않는다 — 그 자체가 레이아웃 변경이다.
 * 판정은 서버에서 끝나므로(`GateProvider` 주석 참조) 하이드레이션 전후로 게이트
 * 유무가 바뀌지 않는다.
 */

import { useCallback, useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { GATED_ROOT_CLASS } from '@/lib/permissions/constants'
import type { GateDecision } from '@/lib/permissions/types'
import { useGate } from './gate-provider'
import {
  GateNotice,
  UpsellOverlay,
  type GateOverlayVariant,
} from './upsell-overlay'

/** 흐림 강도 보정 — globals.css 의 `--sk-gate-blur-{sm,lg}` 토큰과 대응. */
export type GateBlurScale = 'sm' | 'md' | 'lg'

/** 오버레이 변형 자동 선택 임계값 (px). 기획서 §B-1. */
const PANEL_MIN_HEIGHT = 240
const BAR_MIN_HEIGHT = 120

export type FeatureGateProps = {
  featureId: string
  /**
   * 컨텍스트 대신 직접 주입하는 판정. 서버 컴포넌트에서 `getGateDecision()` 결과를
   * 넘기거나, 테스트에서 특정 상태를 재현할 때 쓴다. 주어지면 컨텍스트보다 우선.
   */
  decision?: GateDecision
  /**
   * 가려진 자리에 그릴 더미 형상. 미지정이고 `lockedCount` 가 있으면 기본 더미
   * 행을, 둘 다 없으면 `children` 을 흐린다(위 §1 경고 참조).
   */
  placeholder?: React.ReactNode
  /** 마스킹되어 빠진 항목 수. 더미 행 수를 맞춰 해제 전후 높이를 같게 한다. */
  lockedCount?: number
  /** 흐림 강도. 기본 `md`(표 숫자 기준). 본문은 `sm`, 헤드라인은 `lg`. */
  scale?: GateBlurScale
  /** 오버레이 변형 강제. 미지정 시 컨테이너 높이로 자동 선택. */
  variant?: GateOverlayVariant
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
  placeholder,
  lockedCount,
  scale = 'md',
  variant: variantProp,
  message,
  fallback,
  className,
  children,
}: FeatureGateProps) {
  const contextDecision = useGate(featureId)
  const decision = decisionProp ?? contextDecision

  const descriptionId = useId()
  const [measured, setMeasured] = useState<GateOverlayVariant>('bar')

  // ResizeObserver 는 콜백 ref 로 부착한다 — 게이트는 조건부로 마운트되므로
  // useEffect + useRef 조합은 최초 관측을 놓치는 경우가 있다(2026-07-16 지도 작업).
  const attachMeasure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const apply = (height: number) => {
      setMeasured(
        height >= PANEL_MIN_HEIGHT
          ? 'panel'
          : height >= BAR_MIN_HEIGHT
            ? 'bar'
            : 'inline'
      )
    }
    apply(node.getBoundingClientRect().height)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) apply(entry.contentRect.height)
    })
    observer.observe(node)
    // React 19 의 ref cleanup.
    return () => observer.disconnect()
  }, [])

  // 등급 충족 — 래퍼조차 씌우지 않는다. 게이트가 없는 화면에 `.sk-gated` 가 남으면
  // 페이월 구조화 데이터가 거짓 신고가 된다(§SEO 원칙 4).
  if (decision.allowed || decision.gateMode === 'open') {
    return <>{children}</>
  }

  // 완전 제거. 자리표시자를 두지 않는다 — 없는 걸 계속 광고하면 화면이 업셀
  // 격자가 된다. 자리표시자를 두고 싶어졌다면 그건 hidden 이 잘못된 선택이라는
  // 신호이고, `blur` 또는 `teaser` 로 바꿔야 한다는 뜻이다.
  if (decision.gateMode === 'hidden') {
    return <>{fallback ?? null}</>
  }

  // teaser / partial 은 흐림이 없다. 축약된 **실제** 콘텐츠 + 안내 스트립.
  // (partial 의 셀 단위 마스킹 시각 처리는 `<PartialGate>` 담당 — 여기로 들어온
  //  partial 은 서버가 이미 잘라 보낸 리스트라 안내만 붙이면 된다.)
  if (decision.gateMode === 'teaser' || decision.gateMode === 'partial') {
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

  const variant = variantProp ?? measured
  const veil =
    placeholder ??
    (lockedCount != null ? <GatePlaceholderRows rows={lockedCount} /> : children)

  return (
    <div
      ref={variantProp ? undefined : attachMeasure}
      className={cn(GATED_ROOT_CLASS, 'relative', className)}
      data-gate={decision.gateMode}
      data-feature={featureId}
      aria-describedby={descriptionId}
    >
      {/* 베일 — aria-hidden + inert + pointer-events-none, 셋 다 필요(§2). */}
      <div
        aria-hidden="true"
        inert
        data-gate-scale={scale}
        className="sk-gate-veil pointer-events-none select-none"
      >
        {veil}
      </div>

      {/*
        오버레이 층. bg-background/72 는 반투명이지만 `backdrop-filter` 가 **없다** —
        glassmorphism 이 아니라, 흐린 콘텐츠의 대비를 한 번 더 죽여 오버레이 텍스트가
        읽히게 하는 역할이다. 오버레이 카드 자체는 불투명 `.sk-card`.
      */}
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center bg-background/72',
          variant === 'inline' ? 'p-2' : 'p-4'
        )}
      >
        <UpsellOverlay
          decision={decision}
          variant={variant}
          message={message}
          descriptionId={descriptionId}
        />
      </div>
    </div>
  )
}

/**
 * 기본 더미 형상 — 자릿수·행수만 맞춘 고정 문자열.
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
