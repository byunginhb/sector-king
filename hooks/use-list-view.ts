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
  /**
   * 페이지를 바깥에서 제어한다(controlled). URL 쿼리와 묶어 공유·새로고침에도
   * 위치가 유지되게 할 때 쓴다. 미지정이면 훅이 자체 상태로 관리한다.
   */
  page?: number
  onPageChange?: (page: number) => void
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
  page: controlledPage,
  onPageChange,
}: UseListViewOptions<T>): UseListView<T> {
  /**
   * 페이지는 **훅 안의 state 하나**로 관리하고, 바깥(URL·라우터)과는 effect 로
   * 동기화한다. controlled/uncontrolled 를 서로 다른 경로로 다루던 구조를 접은 것이다.
   *
   * 이렇게 나눈 이유:
   *  - 화면은 **이번 렌더부터** 옳아야 한다. 정렬이 바뀌었는데 옛 페이지를 한 프레임
   *    그리면 잘못된 목록이 스쳐 지나간다.
   *  - 그런데 렌더 중에 건드려도 되는 건 자기 state 뿐이다. 예전엔 렌더 도중
   *    `onPageChange` 를 불러서 React 가 거부했다
   *    ("Cannot update a component (Router) while rendering ...").
   *
   * 그래서 렌더 중에는 `innerPage` 만 조정하고(자기 state라 안전), 바깥에 알리는 건
   * effect 로 미룬다. 바깥이 되돌아오면 아래 else-if 가 다시 받아 적는다.
   */
  const isControlled = controlledPage != null
  const [innerPage, setInnerPage] = useState(controlledPage ?? 1)
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  const [lastControlled, setLastControlled] = useState(controlledPage)

  if (resetKey !== lastResetKey) {
    // 필터·정렬이 바뀌었다 → 1페이지. 바깥 값이 아직 옛 페이지여도 무시한다.
    setLastResetKey(resetKey)
    setLastControlled(controlledPage)
    setInnerPage(1)
  } else if (isControlled && controlledPage !== lastControlled) {
    // 뒤로가기·주소 직접 입력 등 바깥에서 페이지가 바뀐 경우.
    setLastControlled(controlledPage)
    setInnerPage(controlledPage)
  }

  const page = innerPage

  // 바깥에 알리기만 한다 — 여기서 setState 를 부르면 연쇄 렌더가 된다.
  useEffect(() => {
    if (isControlled && controlledPage !== innerPage) onPageChange?.(innerPage)
  }, [isControlled, controlledPage, innerPage, onPageChange])

  /** 함수형 갱신을 지원한다. 바깥 반영은 위 effect 가 맡는다. */
  const setPageState = useCallback((next: number | ((prev: number) => number)) => {
    setInnerPage((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

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
    [setPageState]
  )

  const loadMore = useCallback(() => {
    setPageState((p) => p + 1)
  }, [setPageState])

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
    // controlled 모드에서는 페이지가 바뀔 때 `setPageState` 정체성이 바뀌어
    // 관측자가 다시 붙는다. 재생성은 "더 불러온 직후" 뿐이라 비용이 없다.
  }, [setPageState])

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
