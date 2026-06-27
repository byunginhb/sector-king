'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'
import { CurrencyProvider } from '@/hooks/use-currency'
import { ReducedMotionProvider, useReducedMotion } from '@/hooks/use-reduced-motion'
import { SearchProvider } from './search-provider'
import { GlobalSearch } from './global-search'
import { OnboardingProvider } from './onboarding/onboarding-provider'
import { WelcomeTrigger } from './onboarding/welcome-trigger'
import { useState } from 'react'

/** 모션 토글 상태를 framer-motion 전역에 반영(끄면 transform/layout 애니메이션 정지). */
function MotionGate({ children }: { children: React.ReactNode }) {
  const { reduced } = useReducedMotion()
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <CurrencyProvider>
          <ReducedMotionProvider>
            <MotionGate>
              <SearchProvider>
                <OnboardingProvider>
                  {children}
                  <GlobalSearch />
                  <WelcomeTrigger />
                </OnboardingProvider>
              </SearchProvider>
            </MotionGate>
          </ReducedMotionProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
