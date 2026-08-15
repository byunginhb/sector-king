'use client'

/**
 * 미리보기 배너 — 관리자가 특정 등급의 시점으로 실제 사이트를 볼 때 상시 노출.
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 하단 고정인가
 * ────────────────────────────────────────────────────────────────────
 *
 * 상단은 `components/layout/global-top-bar.tsx` 가 `sticky top-0 z-50` 으로 이미
 * 점유하고 있다. 그 위에 배너를 얹으면 top-bar 의 `top-0` 을 배너 높이만큼 밀어야
 * 하고, 그 순간 모든 페이지의 sticky 계산이 어긋난다. 그래서 하단 고정이다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  `.sk-card` 를 쓰지 않는 의도적 예외
 * ────────────────────────────────────────────────────────────────────
 *
 * 이 배너는 콘텐츠가 아니라 **브라우저 개발 툴바와 같은 위상의 메타 레이어**다.
 * 카드로 그리면 페이지의 한 섹션처럼 읽혀서 "지금 보는 화면이 진짜가 아니다" 라는
 * 유일한 신호가 묻힌다. 그래서 `bg-surface-3` + `border-primary/40` 로
 * 표면 하나만 깔고 카드 레시피를 쓰지 않는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  상태는 쿠키, 이 컴포넌트는 읽기만 한다
 * ────────────────────────────────────────────────────────────────────
 *
 * `sk_preview_tier` 는 의도적으로 `httpOnly` 가 **아니다**(constants.ts 참조).
 * 보안 경계가 아니라 표시 레이어이기 때문이고, 덕분에 이 배너가 루트 레이아웃에서
 * `cookies()` 를 호출하지 않고도 스스로 상태를 읽을 수 있다.
 *
 * 등급 변경·종료는 전부 `/api/preview-tier` 로의 **전체 내비게이션**이다.
 * 클라이언트 라우터로 처리하면 서버 컴포넌트가 옛 등급으로 캐시된 트리를 그대로
 * 재사용할 수 있다 — 미리보기는 서버 렌더 결과가 통째로 바뀌어야 의미가 있다.
 *
 * 미리보기는 **순수 표시 레이어**다. 쓰기 API·결제·관리자 API 는 이 쿠키를 읽지
 * 않는다. 화면만 다른 등급처럼 보일 뿐 실제 권한은 관리자 그대로다.
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'
import { Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PREVIEW_COOKIE,
  PREVIEW_TIERS,
} from '@/lib/permissions/constants'
import { TIER_LABEL, isTier, type Tier } from '@/lib/permissions/tier'

const API_PATH = '/api/preview-tier'

/** 쿠키는 변경 이벤트가 없다 — 값이 바뀔 때는 항상 전체 내비게이션이 함께 일어난다. */
function subscribeNever(): () => void {
  return () => {}
}

function readCookieString(): string {
  return typeof document === 'undefined' ? '' : document.cookie
}

function parsePreviewTier(cookieString: string): Tier | null {
  for (const part of cookieString.split(';')) {
    const [rawName, ...rest] = part.split('=')
    if (rawName.trim() !== PREVIEW_COOKIE) continue
    const value = decodeURIComponent(rest.join('=').trim())
    return isTier(value) ? value : null
  }
  return null
}

export function PreviewBanner() {
  // useSyncExternalStore — 서버 스냅샷은 빈 문자열이라 SSR/초기 HTML 에는 배너가
  // 없다. 관리자만 보는 메타 UI 라 이 한 번의 마운트 지연은 비용이 아니다.
  const cookieString = useSyncExternalStore(
    subscribeNever,
    readCookieString,
    () => ''
  )
  const tier = parsePreviewTier(cookieString)

  const buttonRefs = useRef<Partial<Record<Tier, HTMLButtonElement | null>>>({})

  // 배너 높이만큼 body 하단을 밀어 마지막 콘텐츠·푸터가 가려지지 않게 한다.
  // 상태를 만들지 않고 ref 콜백에서 직접 처리 — 배너 유무는 관리자에게만
  // 발생하는 1회 변화라 여기서 리렌더를 유발할 이유가 없다.
  const attachSpacer = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const apply = () => {
      document.body.style.paddingBottom = `${node.offsetHeight}px`
    }
    apply()
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.body.style.paddingBottom = ''
      }
    }
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    return () => {
      observer.disconnect()
      document.body.style.paddingBottom = ''
    }
  }, [])

  const navigate = useCallback((params: Record<string, string>) => {
    const next = window.location.pathname + window.location.search
    const url = new URL(API_PATH, window.location.origin)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    url.searchParams.set('next', next)
    window.location.assign(url.toString())
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: Tier) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
      if (!keys.includes(event.key)) return
      event.preventDefault()
      const idx = PREVIEW_TIERS.indexOf(current)
      let nextIdx = idx
      if (event.key === 'ArrowLeft') {
        nextIdx = idx <= 0 ? PREVIEW_TIERS.length - 1 : idx - 1
      } else if (event.key === 'ArrowRight') {
        nextIdx = idx >= PREVIEW_TIERS.length - 1 ? 0 : idx + 1
      } else if (event.key === 'Home') {
        nextIdx = 0
      } else {
        nextIdx = PREVIEW_TIERS.length - 1
      }
      const target = PREVIEW_TIERS[nextIdx]
      if (target) buttonRefs.current[target]?.focus()
    },
    []
  )

  if (!tier) return null

  return (
    <div
      ref={attachSpacer}
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-primary/40 bg-surface-3"
    >
      <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Eye className="h-4 w-4 text-primary" aria-hidden />
          <span>미리보기 — {TIER_LABEL[tier]} 시점</span>
        </p>

        {/* 세그먼트 — region-toggle 의 로빙 포커스 패턴.
            컨테이너 role 은 radiogroup 이다(region-toggle 은 group 으로 두어
            자식 radio 와 어긋나 있는데, 그 실수를 복제하지 않는다).
            `관리자` 는 넣지 않는다 — 그건 "종료" 와 같은 뜻이다. */}
        <div
          role="radiogroup"
          aria-label="미리보기 등급"
          className="hidden items-center gap-0.5 rounded-lg bg-muted p-0.5 sm:inline-flex"
        >
          {PREVIEW_TIERS.map((option) => {
            const selected = option === tier
            return (
              <button
                key={option}
                ref={(el) => {
                  buttonRefs.current[option] = el
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  if (!selected) navigate({ tier: option })
                }}
                onKeyDown={(event) => handleKeyDown(event, option)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  selected
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {TIER_LABEL[option]}
              </button>
            )
          })}
        </div>

        {/* 모바일 — 세그먼트가 안 들어가면 select 로 접는다. */}
        <label className="sm:hidden">
          <span className="sr-only">미리보기 등급</span>
          <select
            value={tier}
            onChange={(event) => navigate({ tier: event.target.value })}
            className="rounded-md border border-border-subtle bg-background px-2 py-1 text-xs"
          >
            {PREVIEW_TIERS.map((option) => (
              <option key={option} value={option}>
                {TIER_LABEL[option]}
              </option>
            ))}
          </select>
        </label>

        <p className="hidden flex-1 text-xs text-muted-foreground md:block">
          표시만 바뀝니다. 실제 권한은 관리자 그대로이고, 이 배너는 관리자에게만
          보입니다.
        </p>

        <button
          type="button"
          aria-label="미리보기 종료"
          onClick={() => navigate({ clear: '1' })}
          className={cn(
            'ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
