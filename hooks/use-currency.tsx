'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type Currency,
  DEFAULT_CURRENCY,
  CURRENCY_STORAGE_KEY,
  CURRENCY_ATTRIBUTE,
  isCurrency,
} from '@/lib/currency'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (next: Currency) => void
  /** localStorage 동기화 완료 여부. flash-민감 UI(토글 active 상태)에서 활용 가능 */
  isHydrated: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // SSR/첫 렌더는 항상 DEFAULT_CURRENCY 로 시작(서버·클라 초기 트리 일치 → 하이드레이션 안전).
  // app/layout.tsx 의 inline script 가 <html data-currency> 를 먼저 세팅해 페인트 flash 는 막고,
  // 여기서는 마운트 후 localStorage 를 읽어 React state 를 교정한다.
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // 첫 렌더는 서버/클라 트리 일치를 위해 DEFAULT 로 시작하고, 마운트 후 localStorage 로 교정한다.
    // hydration-safe 패턴(use-onboarding 과 동형)이라 set-state-in-effect 는 의도적이다.
    try {
      const raw = localStorage.getItem(CURRENCY_STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isCurrency(raw)) setCurrencyState(raw)
    } catch {
      // localStorage 불가(프라이빗 모드 등) — DEFAULT 유지
    }
    setIsHydrated(true)
  }, [])

  const setCurrency = useCallback((next: Currency) => {
    if (!isCurrency(next)) return
    setCurrencyState(next)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    } catch {
      // 영속 실패해도 세션 내 동작은 유지
    }
    // data-attr 동기화: inline script 와 같은 소스로 통일(다음 새로고침 flash 방지)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(CURRENCY_ATTRIBUTE, next)
    }
  }, [])

  // 멀티탭 동기화: 다른 탭에서 바꾸면 이 탭도 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CURRENCY_STORAGE_KEY && isCurrency(e.newValue)) {
        setCurrencyState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, isHydrated }),
    [currency, setCurrency, isHydrated]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

/**
 * 전역 통화 상태 훅. useCurrencyFormat 이 내부에서 호출한다.
 * Provider 밖에서 호출되면 DEFAULT_CURRENCY 로 안전 폴백(throw 하지 않음) —
 * OG 이미지/스토리북/테스트 등 Provider 없는 컨텍스트 회복력.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (ctx) return ctx
  return { currency: DEFAULT_CURRENCY, setCurrency: () => {}, isHydrated: false }
}
