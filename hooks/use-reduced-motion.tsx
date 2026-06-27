'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'sector-king-motion'

interface ReducedMotionContextValue {
  /** true 면 애니메이션 끔(reduce). */
  reduced: boolean
  setReduced: (next: boolean) => void
}

const Ctx = createContext<ReducedMotionContextValue | null>(null)

/**
 * 모션(애니메이션) on/off 전역 상태.
 * - html.reduce-motion 클래스: CSS 애니메이션(마켓 티커)·장식 파티클(data-motion-decor) 정지.
 * - framer-motion 은 providers 의 MotionConfig 가 이 값을 읽어 reducedMotion 적용.
 * - localStorage 영속(app/layout.tsx inline script 가 첫 페인트 전 선반영).
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  // SSR/첫 렌더는 false 로 시작(서버·클라 트리 일치), 마운트 후 inline script 가 세팅한 클래스로 교정.
  const [reduced, setReducedState] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedState(document.documentElement.classList.contains('reduce-motion'))
  }, [])

  const setReduced = useCallback((next: boolean) => {
    setReducedState(next)
    document.documentElement.classList.toggle('reduce-motion', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on')
    } catch {
      // 영속 실패해도 세션 내 동작은 유지
    }
  }, [])

  return <Ctx.Provider value={{ reduced, setReduced }}>{children}</Ctx.Provider>
}

export function useReducedMotion(): ReducedMotionContextValue {
  return useContext(Ctx) ?? { reduced: false, setReduced: () => {} }
}
