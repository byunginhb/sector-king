'use client'

/**
 * `<PartialGate>` — 리스트/표의 **일부만** 가리는 게이트.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 행이 아니라 셀을 가리는가
 * ────────────────────────────────────────────────────────────────────
 *
 *   순위  종목            적중률   표본
 *  ──────────────────────────────────────
 *    1    ▒▒▒▒▒▒▒▒▒▒     ▒▒▒▒     ▒▒     ← 값만 흐림, 순위 숫자는 선명
 *    2    ▒▒▒▒▒▒▒▒▒▒     ▒▒▒▒     ▒▒
 *    3    ▒▒▒▒▒▒▒▒▒▒     ▒▒▒▒     ▒▒
 *  ──────────────────────────────────────
 *    4    삼성전기         71.4%    14     ← 여기부터 그대로
 *
 * 순위 번호와 표 구조를 남기는 이유: "1위가 존재한다" 는 정보만으로 업셀이
 * 작동하고 실제 값은 전혀 새지 않는다. 순위까지 지우면 사용자는 자기가 무엇을
 * 놓치고 있는지 모른 채 이탈한다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  오버레이는 묶음당 1개
 * ────────────────────────────────────────────────────────────────────
 *
 * 행마다 CTA 를 반복하면 화면이 광고판이 된다. 그래서 흐린 묶음 위의 오버레이는
 * 하나뿐이고, 설명은 하단 안내 스트립(`GateNotice`, `role="status"`)이 맡는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  표 안에서 쓰는 법 (중요)
 * ────────────────────────────────────────────────────────────────────
 *
 * `<tbody>` 안에 `<div>` 를 끼울 수 없으므로 표에서는 `maskedSlot` 을 쓰지 않는다.
 * 대신 가려야 할 **셀 내용만** `<GatedValue/>` 로 교체하고, 표 전체를 `children`
 * 으로 넘긴다. `<td>` 자체는 살아 있어야 표 구조(행·열 관계)가 깨지지 않는다.
 *
 *   <PartialGate featureId="analysts.leaderboard" lockedCount={3}>
 *     <table>…<td><GatedValue kind="number" /></td>…</table>
 *   </PartialGate>
 *
 * 카드 리스트처럼 블록 요소를 겹쳐도 되는 경우에만 `maskedSlot` 으로 묶음 오버레이를
 * 띄운다.
 */

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { GATED_ROOT_CLASS } from '@/lib/permissions/constants'
import type { GateDecision } from '@/lib/permissions/types'
import type { Tier } from '@/lib/permissions/tier'
import { useGate } from './gate-provider'
import { GateNotice, UpsellOverlay, upsellTone } from './upsell-overlay'
import type { GateBlurScale } from './feature-gate'

/** 필요한 등급 → 안내 문구에 쓸 대상 표현. TIER_LABEL 을 그대로 쓰면 어색하다. */
const AUDIENCE_LABEL = {
  login: '로그인한 사용자',
  subscribe: '구독자',
  pro: 'Pro 구독자',
} as const

function audienceLabel(requiredTier: Tier): string {
  return AUDIENCE_LABEL[upsellTone(requiredTier)]
}

export type PartialGateProps = {
  featureId: string
  /** 컨텍스트 대신 직접 주입하는 판정(서버 컴포넌트·테스트용). */
  decision?: GateDecision
  /**
   * 공개 구간을 포함한 전체 리스트/표. 가려야 하는 셀은 호출자가 이미
   * `<GatedValue/>` 로 바꿔 넘긴다(값은 서버가 지운 상태여야 한다).
   */
  children: React.ReactNode
  /**
   * 흐린 묶음(블록 요소일 때만). 지정하면 이 묶음 위에 단일 오버레이가 뜬다.
   * 표에서는 쓰지 않는다 — 위 주석 참조.
   */
  maskedSlot?: React.ReactNode
  /** 가려진 항목 수. 기본 안내 문구가 이 값을 인용한다. */
  lockedCount?: number
  /** 안내 문구 오버라이드. */
  message?: string
  /** 안내 스트립을 리스트 위에 둘지. 기본은 아래. */
  noticePlacement?: 'top' | 'bottom'
  className?: string
}

export function PartialGate({
  featureId,
  decision: decisionProp,
  children,
  maskedSlot,
  lockedCount,
  message,
  noticePlacement = 'bottom',
  className,
}: PartialGateProps) {
  const contextDecision = useGate(featureId)
  const decision = decisionProp ?? contextDecision
  const noticeId = useId()

  // 등급 충족 — 래퍼도 `.sk-gated` 도 남기지 않는다(페이월 마크업 거짓 신고 방지).
  if (decision.allowed || decision.gateMode === 'open') {
    return <>{children}</>
  }

  const audience = audienceLabel(decision.requiredTier)
  const noticeText =
    message ??
    (lockedCount && lockedCount > 0
      ? `상위 ${lockedCount}개 값은 ${audience}에게 공개됩니다. 나머지 순위는 지금 보시는 그대로입니다.`
      : `일부 값은 ${audience}에게 공개됩니다. 나머지는 지금 보시는 그대로입니다.`)

  const notice = (
    <GateNotice
      decision={decision}
      message={noticeText}
      id={noticeId}
      className={noticePlacement === 'bottom' ? 'mt-3' : 'mb-3'}
    />
  )

  return (
    <div
      className={cn(GATED_ROOT_CLASS, className)}
      data-gate={decision.gateMode}
      data-feature={featureId}
      aria-describedby={noticeId}
    >
      {noticePlacement === 'top' ? notice : null}

      {maskedSlot ? (
        <div className="relative">
          {/* 셀 단위 흐림은 GatedValue 가 이미 걸었다. 이 컨테이너에는 blur 를
              추가로 걸지 않는다 — 걸면 순위 번호까지 사라진다. */}
          <div aria-hidden="true" inert className="pointer-events-none select-none">
            {maskedSlot}
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
            <UpsellOverlay decision={decision} variant="bar" message={message} />
          </div>
        </div>
      ) : null}

      {children}

      {noticePlacement === 'bottom' ? notice : null}
    </div>
  )
}

export type GatedValueProps = {
  /** 더미 형태. 숫자 셀과 이름 셀이 다르게 보여야 표 구조가 읽힌다. */
  kind?: 'number' | 'text'
  /** `text` 더미의 글자 수. 실값에서 파생하지 말 것 — 파생하면 길이가 샌다. */
  chars?: number
  /** 스크린리더 문구에 쓸 필요 등급. */
  requiredTier?: Tier
  /** 흐림 강도. 표 숫자는 기본값(mono 는 글자 폭이 좁아 1px 더 필요). */
  scale?: GateBlurScale
  className?: string
}

/**
 * 셀 하나를 가리는 더미 값.
 *
 * `<td>` 에 통째로 `aria-hidden` 을 걸면 표의 행·열 관계가 깨진다. 그래서
 * **내용만** `aria-hidden` + `inert` 로 빼고, 같은 셀 안에 sr-only 대체 텍스트를
 * 남긴다. 스크린리더는 "Pro 구독자 전용" 을 읽고 표 구조는 그대로 유지된다.
 *
 * 더미는 고정 문자열이다. 실값의 자릿수에 맞추면 흐림 너머로 크기 정보가 샌다.
 */
export function GatedValue({
  kind = 'number',
  chars = 6,
  requiredTier = 'pro',
  scale = 'md',
  className,
}: GatedValueProps) {
  const dummy = kind === 'number' ? '1,234.56' : '━'.repeat(Math.max(1, Math.min(chars, 24)))

  return (
    <>
      <span className="sr-only">{audienceLabel(requiredTier)} 전용</span>
      <span
        aria-hidden="true"
        inert
        data-gate-scale={scale}
        className={cn(
          'sk-gate-veil pointer-events-none inline-block select-none align-middle',
          kind === 'number' && 'font-mono tabular-nums',
          className
        )}
      >
        {dummy}
      </span>
    </>
  )
}
