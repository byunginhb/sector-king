'use client'

import { useState, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'

// localStorage 키 — 버전 suffix 로 카피 변경 시 strip 재노출 가능
const STORAGE_KEY = 'sk:hint-strip-dismissed-v1'
const subscribeNever = () => () => {}

function readVisible() {
  try {
    return !window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

/**
 * 온보딩 힌트 strip.
 *
 * - 자동 페이지 투어 폐기 후 신규 진입자 안내용으로 도입.
 * - localStorage 에 dismiss 플래그가 없으면 표시, 있으면 null 반환.
 * - SSR/초기 hydration에서는 숨기고 브라우저 저장값으로 표시 여부 결정.
 * - 투어 진입은 우상단 도움말 버튼에 일임 (strip 에서는 "둘러보기" 생략).
 */
export function OnboardingHintStrip() {
  const [dismissed, setDismissed] = useState(false)
  const visible = useSyncExternalStore(subscribeNever, readVisible, () => false)

  if (dismissed || !visible) return null

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // 저장 실패해도 세션 내에서는 닫힘 상태 유지
    }
    setDismissed(true)
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-l-2 border-primary bg-surface-2/50 px-4 py-2"
    >
      <p className="flex-1 text-sm text-foreground/85">
        산업 카드를 클릭하면 자금 흐름·시가총액·가격 변화를 함께 볼 수 있습니다.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="이 안내 닫기"
        className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
