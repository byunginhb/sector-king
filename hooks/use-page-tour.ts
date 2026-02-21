'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useOnboardingContext } from '@/components/onboarding/onboarding-provider'
import { tourSteps, type PageId } from '@/components/onboarding/tour-steps'

export function usePageTour(pageId: PageId) {
  const { shouldShowPageTour, completePageTour } = useOnboardingContext()
  const driverRef = useRef<ReturnType<typeof import('driver.js').driver> | null>(null)
  const startedRef = useRef(false)

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

  // Auto-start on page entry if not completed
  useEffect(() => {
    if (!shouldShowPageTour(pageId)) return
    if (startedRef.current) return

    // Wait for DOM to settle (data loading, animations)
    const timer = setTimeout(() => {
      if (!shouldShowPageTour(pageId)) return
      startedRef.current = true
      startTour()
    }, 1000)

    return () => clearTimeout(timer)
  }, [pageId, shouldShowPageTour, startTour])

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
