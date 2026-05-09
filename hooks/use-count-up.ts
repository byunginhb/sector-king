'use client'

import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  /** 애니메이션 시간(ms). 기본 600. */
  duration?: number
  /** 시작값. 기본 0. */
  from?: number
  /** 처음 마운트 후 한 번만 실행할지. 기본 true. */
  once?: boolean
}

/**
 * 0(또는 from) → target 으로 ease-out 카운트업.
 *
 * - prefers-reduced-motion 시 즉시 target.
 * - SSR 친화: 첫 렌더는 from. useEffect 에서만 RAF 시작.
 */
export function useCountUp(target: number, opts: UseCountUpOptions = {}): number {
  const { duration = 600, from = 0, once = true } = opts
  const [value, setValue] = useState<number>(from)
  const startedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (once && startedRef.current) {
      // 이후 갱신은 즉시 반영 (애니메이션 X)
      setValue(target)
      return
    }
    startedRef.current = true

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce || !Number.isFinite(target)) {
      setValue(target)
      return
    }

    const start = performance.now()
    const initial = from
    const delta = target - initial

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(initial + delta * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}
