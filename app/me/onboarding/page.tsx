/**
 * /me/onboarding — 첫 로그인 시 산업 워치 추천 (선택 가능).
 */
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/require-admin'
import { OnboardingPickerStep } from '@/components/me/onboarding-picker-step'
import { GlobalTopBar } from '@/components/layout/global-top-bar'

export const metadata: Metadata = {
  title: '시작하기',
}

export default async function OnboardingPage() {
  await requireUser('/me/onboarding')

  return (
    <div className="min-h-screen bg-background">
      <GlobalTopBar subtitle="시작하기" />

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          관심 산업을 선택해보세요
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          1분이면 충분합니다. 메인 워치리스트와 일별 리포트가 더 풍부해져요.
        </p>
        <OnboardingPickerStep />
      </main>
    </div>
  )
}
