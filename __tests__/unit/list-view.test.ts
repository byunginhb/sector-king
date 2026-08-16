import { describe, it, expect } from 'vitest'

/**
 * `useListView` 의 슬라이스 규칙 — 훅에서 순수 부분만 떼어 검증한다.
 * 두 모드가 같은 `page` 를 공유한다는 것이 이 설계의 핵심이라, 그 계산이
 * 어긋나면 창 크기를 바꿀 때 보던 위치가 사라진다(#54).
 */
function slice<T>(items: T[], mode: 'pages' | 'infinite', page: number, size: number): T[] {
  return mode === 'infinite'
    ? items.slice(0, page * size)
    : items.slice((page - 1) * size, page * size)
}

const ITEMS = Array.from({ length: 25 }, (_, i) => i + 1)

describe('목록 슬라이스 — 페이징', () => {
  it('1페이지는 앞에서부터 pageSize 만큼', () => {
    expect(slice(ITEMS, 'pages', 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('2페이지는 창이 이동한다 (누적이 아니다)', () => {
    expect(slice(ITEMS, 'pages', 2, 10)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('마지막 페이지는 남은 만큼만', () => {
    expect(slice(ITEMS, 'pages', 3, 10)).toEqual([21, 22, 23, 24, 25])
  })
})

describe('목록 슬라이스 — 무한 스크롤', () => {
  it('page 가 오르면 누적된다', () => {
    expect(slice(ITEMS, 'infinite', 1, 10)).toHaveLength(10)
    expect(slice(ITEMS, 'infinite', 2, 10)).toHaveLength(20)
    expect(slice(ITEMS, 'infinite', 3, 10)).toHaveLength(25)
  })

  it('전체를 넘어서도 초과하지 않는다', () => {
    expect(slice(ITEMS, 'infinite', 99, 10)).toHaveLength(25)
  })
})

describe('모드 전환 — 같은 page 를 공유한다', () => {
  it('페이징 1페이지와 무한 1페이지의 첫 화면이 정확히 같다 (SSR 안전의 근거)', () => {
    expect(slice(ITEMS, 'pages', 1, 10)).toEqual(slice(ITEMS, 'infinite', 1, 10))
  })

  it('3페이지를 보던 중 모바일로 좁히면 그때까지의 분량이 남는다', () => {
    // 페이징 3페이지(21~25)를 보던 사용자가 무한 모드가 되면 1~25 가 쌓여 있다.
    // 위치가 리셋되지 않는 것이 핵심 — 목록 맨 앞으로 튕기지 않는다.
    const infinite = slice(ITEMS, 'infinite', 3, 10)
    expect(infinite).toContain(21)
    expect(infinite[0]).toBe(1)
  })
})

describe('총 페이지 수', () => {
  const totalPages = (n: number, size: number) => Math.max(1, Math.ceil(n / size))

  it('나누어떨어지지 않으면 올림', () => {
    expect(totalPages(25, 10)).toBe(3)
    expect(totalPages(20, 10)).toBe(2)
  })

  it('빈 목록도 1페이지다 (0페이지는 표현할 수 없다)', () => {
    expect(totalPages(0, 10)).toBe(1)
  })
})
