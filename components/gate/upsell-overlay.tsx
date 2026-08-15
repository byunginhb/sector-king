'use client'

/**
 * 업셀 오버레이 — 잠긴 영역에서 **유일하게 접근 가능한 영역**.
 *
 * 흐린 베일은 `aria-hidden` + `inert` 라 스크린리더도 키보드도 닿지 않는다.
 * 그래서 "왜 잠겼는지 / 무엇을 하면 열리는지" 는 전적으로 이 컴포넌트가 낸다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  카피 톤 규칙 (기획서 §B-5)
 * ────────────────────────────────────────────────────────────────────
 *  - 손실 공포·긴급성(`지금만`, `마감 임박`, 카운트다운) 금지. 이 서비스는
 *    "이 수치가 의미하지 않는 것" 을 쓰는 톤이다. 압박 카피는 그 신뢰 자산을 깎는다.
 *  - 형용사(강력한, 완벽한, 놀라운) 대신 **무엇을 얻는지 사실로** 쓴다.
 *  - 산출 기준으로 가는 보조 링크를 함께 둔다 — 잠긴 화면에서도 방법론이
 *    열려 있다는 것 자체가 신뢰 신호다.
 *  - 이모지 없음. 아이콘은 `Lock` **하나**뿐이고 CTA 버튼에 화살표를 또 붙이지
 *    않는다. `Sparkles` 금지(2026-08-05 대개편에서 4→0 으로 제거한 클리셰) —
 *    잠김은 마법이 아니라 자물쇠다.
 *
 * 오버레이 카드는 **불투명 `.sk-card`** 다. `backdrop-blur` 를 쓰지 않는다:
 * 여기서 blur 는 콘텐츠를 가리는 수단이지 표면 장식이 아니다(globals.css
 * `.sk-gate-veil` 주석 참조).
 */

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveCtaHref } from '@/lib/permissions/gate'
import type { GateDecision } from '@/lib/permissions/types'
import type { Tier } from '@/lib/permissions/tier'

/** 컨테이너 높이에 따라 자동 선택되는 오버레이 변형. */
export type GateOverlayVariant = 'panel' | 'bar' | 'inline'

/** 공통 포커스 링 — region-toggle 과 동일 레시피. */
export const GATE_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

type UpsellTone = 'login' | 'subscribe' | 'pro'

type ToneCopy = {
  eyebrow: string
  /** panel 용 본문 — 두 문장. */
  body: string
  /** bar·inline 용 한 문장. */
  short: string
  ctaLabel: string
  secondary: { href: string; label: string }
}

const TONE_COPY: Record<UpsellTone, ToneCopy> = {
  login: {
    eyebrow: '로그인 필요',
    body: '이 내용은 로그인한 사용자에게 공개됩니다. 계정을 만들면 관심 종목과 설정이 기기와 무관하게 유지됩니다.',
    short: '로그인하면 볼 수 있습니다.',
    ctaLabel: '로그인',
    secondary: { href: '/pricing', label: '등급별로 열리는 기능' },
  },
  subscribe: {
    eyebrow: '구독자 전용',
    body: '이 내용은 구독자에게 공개됩니다. 산출에 쓰인 데이터 범위와 계산식은 구독 여부와 무관하게 모두 공개되어 있습니다.',
    short: '구독자에게 공개됩니다.',
    ctaLabel: '구독 안내',
    secondary: { href: '/methodology', label: '산출 방법론' },
  },
  pro: {
    eyebrow: 'Pro 전용',
    body: '이 내용은 Pro 구독자에게 공개됩니다. 순위와 지표의 산출 기준(계산식·표본 조건)은 모두 공개되어 있습니다.',
    short: 'Pro 구독자에게 공개됩니다.',
    ctaLabel: 'Pro 알아보기',
    secondary: { href: '/methodology', label: '산출 방법론' },
  },
}

/**
 * 필요한 등급 → 카피 톤.
 *
 * 기준을 `requiredTier` 하나로 잡는 이유: 비로그인 사용자가 구독 전용 기능을
 * 만났을 때 "로그인하세요" 가 아니라 "구독 안내" 로 보내야 한 번에 끝난다.
 * 구독 안내 페이지가 로그인까지 안내하므로 단계가 늘지 않는다.
 */
export function upsellTone(requiredTier: Tier): UpsellTone {
  if (requiredTier === 'free') return 'login'
  if (requiredTier === 'basic') return 'subscribe'
  return 'pro'
}

export type UpsellOverlayProps = {
  decision: GateDecision
  /** 컨테이너 크기로 정해진 변형. 기본 `panel`. */
  variant?: GateOverlayVariant
  /** 기능별 본문 카피. 미지정 시 등급별 기본 문구. */
  message?: string
  /** 설명 문단의 id — 게이트 루트의 `aria-describedby` 가 이걸 가리킨다. */
  descriptionId?: string
  className?: string
}

export function UpsellOverlay({
  decision,
  variant = 'panel',
  message,
  descriptionId,
  className,
}: UpsellOverlayProps) {
  const tone = upsellTone(decision.requiredTier)
  const copy = TONE_COPY[tone]
  const href = resolveCtaHref(decision)
  const ctaLabel = decision.params?.ctaLabel ?? copy.ctaLabel
  const body = message ?? copy.body
  const short = message ?? copy.short

  const cta = (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-primary px-3 py-2',
        'text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90',
        GATE_FOCUS_RING
      )}
    >
      {ctaLabel}
    </Link>
  )

  if (variant === 'inline') {
    // 카드 없이 한 줄. 120px 미만 컨테이너에서는 카드가 컨테이너보다 커진다.
    return (
      <div
        className={cn(
          'inline-flex max-w-full items-center gap-2 overflow-hidden rounded-md',
          'border border-border-subtle bg-surface-1 px-3 py-1.5',
          className
        )}
      >
        <Lock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <p id={descriptionId} className="truncate text-xs text-foreground/85">
          {short}
        </p>
        <Link
          href={href}
          className={cn(
            'shrink-0 rounded text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80',
            GATE_FOCUS_RING
          )}
        >
          {ctaLabel}
        </Link>
      </div>
    )
  }

  if (variant === 'bar') {
    return (
      <div
        className={cn(
          'sk-card flex max-w-full items-center gap-3 overflow-hidden px-4 py-3',
          className
        )}
      >
        <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="eyebrow eyebrow-accent">{copy.eyebrow}</p>
          <p id={descriptionId} className="mt-1 truncate text-sm text-foreground/85">
            {short}
          </p>
        </div>
        <div className="shrink-0">{cta}</div>
      </div>
    )
  }

  return (
    <div className={cn('sk-card max-w-sm overflow-hidden p-5 text-center', className)}>
      <Lock className="mx-auto h-4 w-4 text-primary" aria-hidden />
      <p className="eyebrow eyebrow-accent mt-3">{copy.eyebrow}</p>
      <p id={descriptionId} className="mt-2 text-sm text-foreground/85">
        {body}
      </p>
      <div className="mt-4">{cta}</div>
      <p className="mt-3 text-xs text-muted-foreground">
        <Link
          href={copy.secondary.href}
          className={cn(
            'rounded underline underline-offset-2 hover:text-foreground',
            GATE_FOCUS_RING
          )}
        >
          {copy.secondary.label}
        </Link>
      </p>
    </div>
  )
}

export type GateNoticeProps = {
  decision: GateDecision
  /** 기능별 안내 문구. 미지정 시 등급별 기본 한 문장. */
  message?: string
  /** `aria-describedby` 대상으로 쓸 때의 id. */
  id?: string
  className?: string
}

/**
 * 안내 스트립 — `partial` / `teaser` 게이트의 설명 줄.
 *
 * **`role="status"` 이고 `aria-hidden` 이 아니다.** 흐려진 영역 전체가
 * `aria-hidden` + `inert` 로 접근성 트리에서 빠지기 때문에, 스크린리더 사용자에게
 * "무엇이 왜 빠졌는지" 를 알리는 **유일한 통로**가 이 줄이다. 이걸 장식으로 보고
 * 숨기면 partial 게이트는 접근성상 그냥 "행 몇 개가 사라진 표" 가 된다.
 *
 * 오버레이는 묶음당 1개라는 규칙도 여기서 지켜진다 — 행마다 CTA 를 반복하면
 * 화면이 광고판이 된다.
 */
export function GateNotice({ decision, message, id, className }: GateNoticeProps) {
  const tone = upsellTone(decision.requiredTier)
  const copy = TONE_COPY[tone]
  const href = resolveCtaHref(decision)
  const ctaLabel = decision.params?.ctaLabel ?? copy.ctaLabel

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-primary bg-surface-2/50 px-4 py-2',
        className
      )}
    >
      <p id={id} className="min-w-0 flex-1 text-sm text-foreground/85">
        {message ?? copy.short}
      </p>
      <Link
        href={href}
        className={cn(
          'shrink-0 rounded text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80',
          GATE_FOCUS_RING
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
