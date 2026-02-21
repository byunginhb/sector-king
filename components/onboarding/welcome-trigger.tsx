'use client'

import { useOnboardingContext } from './onboarding-provider'
import { WelcomeModal } from './welcome-modal'

export function WelcomeTrigger() {
  const { shouldShowWelcome, completeWelcome } = useOnboardingContext()

  if (!shouldShowWelcome) return null

  return <WelcomeModal open={shouldShowWelcome} onComplete={completeWelcome} />
}
