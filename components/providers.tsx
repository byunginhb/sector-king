'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { CurrencyProvider } from '@/hooks/use-currency'
import { SearchProvider } from './search-provider'
import { GlobalSearch } from './global-search'
import { OnboardingProvider } from './onboarding/onboarding-provider'
import { WelcomeTrigger } from './onboarding/welcome-trigger'
import { useState } from 'react'

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
          <SearchProvider>
            <OnboardingProvider>
              {children}
              <GlobalSearch />
              <WelcomeTrigger />
            </OnboardingProvider>
          </SearchProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
