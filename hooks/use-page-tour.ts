'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useOnboardingContext } from '@/components/onboarding/onboarding-provider'
import { tourSteps, type PageId } from '@/components/onboarding/tour-steps'

/**
 * 페이지 투어 훅.
 *
 * 자동 트리거는 폐기되었다 (Phase 2 온보딩 전략 변경).
 * 이제 이 훅은 `startTour()` 함수만 반환하며, 호출 측에서 명시적으로 호출해야 한다.
 * 진입점은 우상단 도움말 버튼(HelpButton) 한 곳뿐.
 */
export function usePageTour(pageId: PageId) {
  const { completePageTour } = useOnboardingContext()
  const driverRef = useRef<ReturnType<typeof import('driver.js').driver> | null>(null)

  const startTour = useCallback(() => {
    const steps = tourSteps[pageId]
    if (!steps || steps.length === 0) return

    // Check that at least the first step target exists in DOM
    const firstEl = steps[0].element
    if (typeof firstEl === 'string' && !document.querySelector(firstEl)) return

    // Dynamic import to avoid SSR issues
    import('driver.js')
      .then(({ driver }) => {
        // Cleanup previous instance
        if (driverRef.current) {
          driverRef.current.destroy()
        }

        const driverInstance = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          overlayColor: 'black',
          stagePadding: 8,
          stageRadius: 8,
          popoverOffset: 12,
          progressText: '{{current}} / {{total}}',
          nextBtnText: '다음',
          prevBtnText: '이전',
          doneBtnText: '완료',
          steps,
          onDestroyed: () => {
            completePageTour(pageId)
            driverRef.current = null
          },
        })

        driverRef.current = driverInstance
        driverInstance.drive()
      })
      .catch(() => {
        // driver.js 로드 실패 시 조용히 무시 (온보딩은 핵심 기능이 아님)
      })
  }, [pageId, completePageTour])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [])

  return { startTour }
}
