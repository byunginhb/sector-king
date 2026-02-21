'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sector-king-onboarding'
const CURRENT_VERSION = 1

interface OnboardingState {
  welcomeCompleted: boolean
  pageToursCompleted: Record<string, boolean>
  version: number
}

const DEFAULT_STATE: OnboardingState = {
  welcomeCompleted: false,
  pageToursCompleted: {},
  version: CURRENT_VERSION,
}

function readState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE

    const parsed = JSON.parse(raw) as OnboardingState
    if (parsed.version !== CURRENT_VERSION) return DEFAULT_STATE

    return parsed
  } catch {
    return DEFAULT_STATE
  }
}

function writeState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read from localStorage after hydration
  useEffect(() => {
    setState(readState())
    setIsHydrated(true)
  }, [])

  const persistState = useCallback((newState: OnboardingState) => {
    setState(newState)
    writeState(newState)
  }, [])

  const completeWelcome = useCallback(() => {
    const current = readState()
    persistState({ ...current, welcomeCompleted: true })
  }, [persistState])

  const completePageTour = useCallback(
    (pageId: string) => {
      const current = readState()
      persistState({
        ...current,
        pageToursCompleted: { ...current.pageToursCompleted, [pageId]: true },
      })
    },
    [persistState]
  )

  const shouldShowWelcome = isHydrated && !state.welcomeCompleted

  const shouldShowPageTour = useCallback(
    (pageId: string) => {
      if (!isHydrated) return false
      if (!state.welcomeCompleted) return false
      return !state.pageToursCompleted[pageId]
    },
    [isHydrated, state.welcomeCompleted, state.pageToursCompleted]
  )

  const resetPageTour = useCallback(
    (pageId: string) => {
      const current = readState()
      const { [pageId]: _, ...rest } = current.pageToursCompleted
      persistState({ ...current, pageToursCompleted: rest })
    },
    [persistState]
  )

  const resetAll = useCallback(() => {
    persistState(DEFAULT_STATE)
  }, [persistState])

  return {
    isHydrated,
    shouldShowWelcome,
    shouldShowPageTour,
    completeWelcome,
    completePageTour,
    resetPageTour,
    resetAll,
  }
}
