'use client'

/**
 * `useRegion` — URL 쿼리 `?region=` 동기화 훅 (Suspense 필수)
 *
 * ⚠️ 이 훅은 내부적으로 `next/navigation` 의 `useSearchParams` 를 사용한다.
 * Next.js 15+ App Router 에서 `useSearchParams` 를 사용하는 클라이언트 컴포넌트는
 * 반드시 부모 Server Component(또는 Page) 에서 `<Suspense>` 로 감싸야 한다.
 * 그렇지 않으면 prerender 시 빌드 경고/에러가 발생할 수 있다.
 *
 * 사용 예:
 *
 * ```tsx
 * // app/some/page.tsx (Server Component)
 * import { Suspense } from 'react'
 * import { ClientView } from './client-view'
 *
 * export default function Page() {
 *   return (
 *     <Suspense fallback={null}>
 *       <ClientView />
 *     </Suspense>
 *   )
 * }
 * ```
 *
 * ```tsx
 * // ./client-view.tsx
 * 'use client'
 * import { useRegion } from '@/hooks/use-region'
 *
 * export function ClientView() {
 *   const { region, setRegion } = useRegion()
 *   // ...
 * }
 * ```
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { RegionFilter } from '@/types'

const VALID_REGIONS: readonly RegionFilter[] = ['all', 'kr', 'global'] as const

function isValidRegion(value: string | null): value is RegionFilter {
  return value === 'all' || value === 'kr' || value === 'global'
}

/**
 * URL 쿼리 `?region=` 와 React 상태를 동기화하는 훅.
 *
 * - `region === 'all'` 이면 URL에서 키를 제거 (default는 URL 생략)
 * - 잘못된 값은 'all' 폴백
 * - `router.replace({ scroll: false })` — history 오염 없음
 *
 * @remarks
 * 이 훅을 호출하는 클라이언트 컴포넌트는 **부모 Server Component 에서
 * `<Suspense>` 로 감싸야 한다**. 자세한 예시는 파일 상단 JSDoc 참조.
 */
export function useRegion(): {
  region: RegionFilter
  setRegion: (next: RegionFilter) => void
} {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const region = useMemo<RegionFilter>(() => {
    const raw = searchParams.get('region')
    return isValidRegion(raw) ? raw : 'all'
  }, [searchParams])

  const setRegion = useCallback(
    (next: RegionFilter) => {
      if (!VALID_REGIONS.includes(next)) return
      const sp = new URLSearchParams(searchParams.toString())
      if (next === 'all') {
        sp.delete('region')
      } else {
        sp.set('region', next)
      }
      const qs = sp.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      router.replace(url, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { region, setRegion }
}
