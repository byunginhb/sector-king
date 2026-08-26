import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListView } from '@/hooks/use-list-view'

/**
 * 정렬·필터가 바뀔 때의 페이지 되돌리기.
 *
 * 이 동작에는 서로 당기는 요구가 둘 있다.
 *  1) 화면은 **이번 렌더부터** 1페이지여야 한다(옛 페이지가 한 프레임 스치면 안 된다).
 *  2) 그런데 controlled 모드의 page 는 바깥(URL·라우터) 소유라, 렌더 중에
 *     `onPageChange` 를 부르면 React 가 거부한다
 *     ("Cannot update a component (Router) while rendering ...").
 *
 * 아래 테스트는 1)을 고정한다. 되돌리기를 바깥에만 맡기면 page 가 옛 값으로
 * 남아 곧바로 깨진다.
 */
const ITEMS = Array.from({ length: 45 }, (_, i) => i + 1)

describe('useListView — resetKey 로 1페이지 복귀', () => {
  it('controlled: resetKey 가 바뀌면 바깥이 따라오기 전에도 즉시 1페이지', () => {
    const onPageChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useListView({ items: ITEMS, pageSize: 20, resetKey, page: 3, onPageChange }),
      { initialProps: { resetKey: 'a' } }
    )

    expect(result.current.page).toBe(3)

    // 정렬을 바꾼 상황. page prop 은 아직 3 (URL 이 갱신되기 전)
    rerender({ resetKey: 'b' })

    expect(result.current.page).toBe(1)
    // 1페이지 분량만 보인다 — 페이징·무한 어느 모드든 앞에서부터 20개다.
    // (jsdom 은 matchMedia 결과에 따라 무한 모드로 떨어질 수 있어 page 로 단언한다)
    expect(result.current.visible).toHaveLength(20)
    // 바깥에도 알린다 — 다만 렌더가 아니라 effect 에서
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('controlled: 바깥이 1로 따라오면 그대로 1페이지', () => {
    const onPageChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ resetKey, page }: { resetKey: string; page: number }) =>
        useListView({ items: ITEMS, pageSize: 20, resetKey, page, onPageChange }),
      { initialProps: { resetKey: 'a', page: 3 } }
    )

    rerender({ resetKey: 'b', page: 3 })
    rerender({ resetKey: 'b', page: 1 })

    expect(result.current.page).toBe(1)
    expect(result.current.visible).toHaveLength(20)
  })

  it('controlled: resetKey 가 그대로면 페이지를 건드리지 않는다', () => {
    const onPageChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useListView({ items: ITEMS, pageSize: 20, resetKey, page: 3, onPageChange }),
      { initialProps: { resetKey: 'a' } }
    )

    rerender({ resetKey: 'a' })

    expect(result.current.page).toBe(3)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('uncontrolled: resetKey 가 바뀌면 내부 상태로 1페이지', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) =>
        useListView({ items: ITEMS, pageSize: 20, resetKey }),
      { initialProps: { resetKey: 'a' } }
    )

    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ resetKey: 'b' })
    expect(result.current.page).toBe(1)
  })
})
