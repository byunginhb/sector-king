'use client'

import { createContext, useContext } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'

type OnboardingContextValue = ReturnType<typeof useOnboarding>

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const onboarding = useOnboarding()

  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider')
  }
  return context
}
