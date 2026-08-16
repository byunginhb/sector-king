'use client'

/**
 * 긴 목록 뷰 전략 — **PC 는 페이징, 모바일은 무한 스크롤.**
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 기기마다 다른가
 * ────────────────────────────────────────────────────────────────────
 *
 * 페이지 번호를 눌러 이동하는 동작은 모바일에서 불편하고(작은 타깃, 엄지 이동),
 * 무한 스크롤은 PC 에서 "몇 번째쯤 봤는지" 감각과 공유 가능한 위치를 잃는다.
 * 그래서 한쪽을 고르지 않고 뷰포트에 따라 나눈다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  두 모드가 같은 상태(`page`)를 공유한다 — 전환 시 위치가 유지되는 이유
 * ────────────────────────────────────────────────────────────────────
 *
 *   페이징   보이는 것 = items[(page-1)*size … page*size]   (창 하나)
 *   무한     보이는 것 = items[0 … page*size]               (누적)
 *
 * 상태를 둘로 두면 창 크기를 바꾸는 순간 "보던 위치"가 리셋된다. 하나로 두면
 * 3페이지를 보던 사람이 모바일로 좁혀도 3페이지 분량이 그대로 쌓여 있다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  SSR 안전
 * ────────────────────────────────────────────────────────────────────
 *
 * 서버는 뷰포트를 모른다. 그래서 초기값은 **페이징 모드**이고 첫 페이지 분량만
 * 렌더한다 — 두 모드의 첫 화면이 정확히 같으므로 하이드레이션 불일치가 없다.
 * (모바일에서 자동으로 무한 모드가 되는 것은 마운트 직후 1회.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** 무한 스크롤로 전환되는 경계 — Tailwind `sm`. */
const DESKTOP_QUERY = '(min-width: 640px)'

export type ListViewMode = 'pages' | 'infinite'

export type UseListViewOptions<T> = {
  items: readonly T[]
  /** 한 페이지(또는 한 번에 더 불러올) 항목 수. */
  pageSize?: number
  /**
   * 이 값이 바뀌면 1페이지로 되돌린다. 필터·정렬·탭 키를 넘긴다.
   * (3페이지를 보던 중 필터를 바꾸면 결과가 3건뿐일 수 있는데, 그때 3페이지에
   *  머물면 빈 화면이 뜬다.)
   */
  resetKey?: unknown
}

export type UseListView<T> = {
  /** 현재 화면에 그릴 항목. */
  visible: T[]
  mode: ListViewMode
  page: number
  totalPages: number
  setPage: (page: number) => void
  /** 무한 모드에서 다음 묶음을 더 불러온다. */
  loadMore: () => void
  hasMore: boolean
  /** 무한 모드 센티넬 — 이 요소가 보이면 자동으로 `loadMore`. */
  sentinelRef: (node: HTMLElement | null) => void
  /** "N개 중 M개 표시" 문구용. */
  shownCount: number
  totalCount: number
}

export function useListView<T>({
  items,
  pageSize = 20,
  resetKey,
}: UseListViewOptions<T>): UseListView<T> {
  const [page, setPageState] = useState(1)
  // SSR·초기 렌더는 페이징으로 고정한다(두 모드의 첫 화면이 같아 불일치가 없다).
  const [mode, setMode] = useState<ListViewMode>('pages')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(DESKTOP_QUERY)
    const apply = () => setMode(mq.matches ? 'pages' : 'infinite')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /**
   * 필터·정렬이 바뀌면 1페이지로 되돌린다.
   *
   * effect 가 아니라 **렌더 중 조정**이다(React 의 "props 변경 시 state 조정"
   * 패턴). effect 로 하면 옛 페이지로 한 번 그린 뒤 다시 그려서 잘못된 화면이
   * 한 프레임 스쳐 지나간다.
   */
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    setPageState(1)
  }

  const totalCount = items.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // 목록이 줄어들어 현재 페이지가 범위를 벗어나면 마지막 페이지로 끌어당긴다.
  // (필터 변경은 resetKey 가 처리하지만, 항목 삭제 같은 경로도 있다.)
  const safePage = Math.min(page, totalPages)

  const visible = useMemo(() => {
    if (mode === 'infinite') return items.slice(0, safePage * pageSize)
    return items.slice((safePage - 1) * pageSize, safePage * pageSize)
  }, [items, mode, safePage, pageSize])

  const hasMore = safePage < totalPages

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.max(1, next))
    },
    []
  )

  const loadMore = useCallback(() => {
    setPageState((p) => p + 1)
  }, [])

  /**
   * 센티넬은 **콜백 ref** 로 붙인다. 목록이 비었다가 채워지는 화면에서
   * `useEffect` + `useRef` 조합은 최초 관측을 놓치는 경우가 있다
   * (2026-07-16 시총 지도에서 같은 문제를 겪었다).
   */
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 관측 콜백이 최신 값을 보게 하는 거울. **렌더 중에 쓰지 않는다** —
  // 렌더 도중 ref 를 갱신하면 concurrent 렌더가 버려질 때 값이 어긋난다.
  // 콜백은 비동기로 불리므로 커밋 후 반영으로 충분하다.
  const hasMoreRef = useRef(hasMore)
  const modeRef = useRef<ListViewMode>(mode)
  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          // 페이징 모드에서는 센티넬이 렌더되지 않지만, 전환 직후 남아 있는
          // 관측이 페이지를 밀어 올리지 않도록 모드도 함께 본다.
          if (modeRef.current !== 'infinite' || !hasMoreRef.current) continue
          setPageState((p) => p + 1)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return {
    visible,
    mode,
    page: safePage,
    totalPages,
    setPage,
    loadMore,
    hasMore,
    sentinelRef,
    shownCount: mode === 'infinite' ? visible.length : Math.min(safePage * pageSize, totalCount),
    totalCount,
  }
}
