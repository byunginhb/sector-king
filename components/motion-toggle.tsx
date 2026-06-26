'use client'

import { useEffect, useState } from 'react'
import { Zap, ZapOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 모션(애니메이션) on/off 토글. off 시 <html class="reduce-motion"> 로 마켓 티커·CSS 애니메이션 정지.
 * 설정은 localStorage('sector-king-motion')에 저장되어 새로고침 후에도 유지된다
 * (app/layout.tsx inline script 가 첫 페인트 전에 선반영). */
const MOTION_STORAGE_KEY = 'sector-king-motion'

export function MotionToggle({ className }: { className?: string }) {
  // SSR/첫 렌더는 'on'(reduced=false)로 시작해 서버·클라 트리 일치를 보장하고,
  // 마운트 후 inline script 가 세팅한 html 클래스로 교정한다(하이드레이션 안전).
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    // 마운트 후 inline script 가 세팅한 html 클래스로 교정(use-currency 와 동형의 hydration-safe 패턴).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(document.documentElement.classList.contains('reduce-motion'))
  }, [])

  const toggle = () => {
    const next = !reduced
    setReduced(next)
    document.documentElement.classList.toggle('reduce-motion', next)
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next ? 'off' : 'on')
    } catch {
      // 영속 실패해도 세션 내 동작은 유지
    }
  }

  const Icon = reduced ? ZapOff : Zap
  const label = reduced ? '애니메이션 켜기' : '애니메이션 끄기'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}
