'use client'

import { Zap, ZapOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

/** 모션(애니메이션) on/off 토글. off 시:
 * - html.reduce-motion → 마켓 티커·CSS 애니메이션·장식 파티클(data-motion-decor) 정지
 * - MotionConfig(providers) → framer-motion 이동 애니메이션 정지
 * 설정은 localStorage 에 저장되어 새로고침 후에도 유지된다. */
export function MotionToggle({ className }: { className?: string }) {
  const { reduced, setReduced } = useReducedMotion()

  const Icon = reduced ? ZapOff : Zap
  const label = reduced ? '애니메이션 켜기' : '애니메이션 끄기'

  return (
    <button
      type="button"
      onClick={() => setReduced(!reduced)}
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
