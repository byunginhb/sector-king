'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'

// localStorage 키 — 버전 suffix 로 카피 변경 시 strip 재노출 가능
const STORAGE_KEY = 'sk:hint-strip-dismissed-v1'

/**
 * 온보딩 힌트 strip.
 *
 * - 자동 페이지 투어 폐기 후 신규 진입자 안내용으로 도입.
 * - localStorage 에 dismiss 플래그가 없으면 표시, 있으면 null 반환.
 * - SSR/CSR mismatch 방지를 위해 mounted flag 사용.
 * - 투어 진입은 우상단 도움말 버튼에 일임 (strip 에서는 "둘러보기" 생략).
 */
export function OnboardingHintStrip() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY)
      setVisible(!dismissed)
    } catch {
      // 비공개 모드/접근 거부 환경에서는 표시 시도하지 않음 (조용히 무시)
      setVisible(false)
    }
  }, [])

  if (!mounted || !visible) return null

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // 저장 실패해도 세션 내에서는 닫힘 상태 유지
    }
    setVisible(false)
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5"
    >
      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" aria-hidden />
      <p className="text-sm text-foreground/85 flex-1">
        처음이신가요? 산업 카드를 클릭하면 자금 흐름·시가총액·가격 변화를 모두 볼 수 있어요.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="이 안내 닫기"
        className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
