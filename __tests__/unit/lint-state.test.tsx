import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { GlobalSearch } from '@/components/global-search'
import { GlobalTopBar } from '@/components/layout/global-top-bar'
import { NewsSubscribeCta } from '@/components/news/news-subscribe-cta'
import { OnboardingHintStrip } from '@/components/onboarding/onboarding-hint-strip'
import { useOnboarding } from '@/hooks/use-onboarding'

const mocks = vi.hoisted(() => ({
  open: true,
  close: vi.fn(),
  push: vi.fn(),
  search: { results: [] as { ticker: string; name: string }[] },
  user: null as { id: string } | null,
  subscription: { dailyReport: false, emailEnabled: true },
  update: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/' }))
vi.mock('@/components/search-provider', () => ({ useSearchContext: () => ({ isOpen: mocks.open, close: mocks.close }) }))
vi.mock('@/hooks/use-search', () => ({ useSearch: () => ({ data: mocks.search, isLoading: false }) }))
vi.mock('@/hooks/use-industries', () => ({ useIndustries: () => ({ data: { industries: [] } }) }))
vi.mock('@/hooks/use-currency-format', () => ({ useCurrencyFormat: () => ({ marketCap: String }) }))
vi.mock('@/hooks/use-currency', () => ({ useCurrency: () => ({ currency: 'KRW', setCurrency: vi.fn() }) }))
vi.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: mocks.user, isLoading: false }) }))
vi.mock('@/hooks/me/use-email-subscription', () => ({
  useEmailSubscription: () => ({ subscription: mocks.subscription, update: mocks.update, isPending: false }),
}))
vi.mock('@/components/auth/auth-button-client', () => ({ AuthButtonClient: () => <button>계정 테스트</button> }))
vi.mock('@/components/share-button', () => ({ ShareButton: () => null }))
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }))
vi.mock('@/components/search-trigger', () => ({ SearchTrigger: () => null, SearchTriggerWide: () => null }))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.open = true
  mocks.search = { results: [] }
  mocks.user = null
  mocks.subscription = { dailyReport: false, emailEnabled: true }
  mocks.update.mockResolvedValue(undefined)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('search lifecycle', () => {
  it('resets keyboard selection when asynchronous stock results arrive and clears the query on reopen', () => {
    mocks.search = { results: [{ ticker: 'A', name: 'First' }, { ticker: 'B', name: 'Second' }] }
    const view = render(<GlobalSearch />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: 'unlikely-query' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    mocks.search = { results: [{ ticker: 'C', name: 'Updated' }, { ticker: 'D', name: 'Next' }] }
    view.rerender(<GlobalSearch />)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mocks.push).toHaveBeenLastCalledWith('/stock/C')
    expect(mocks.close).toHaveBeenCalledOnce()
    mocks.open = false
    view.rerender(<GlobalSearch />)
    expect(screen.queryByRole('dialog')).toBeNull()
    mocks.open = true
    view.rerender(<GlobalSearch />)
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.getByRole('textbox')).toHaveFocus()
  })

  it('handles empty results and Escape without navigating', () => {
    render(<GlobalSearch />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'unlikely-query' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mocks.push).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(mocks.close).toHaveBeenCalledOnce()
  })
})

describe('persisted guidance', () => {
  it('hydrates a completed onboarding record without reopening welcome or completed tours', async () => {
    function OnboardingStatus() {
      const onboarding = useOnboarding()
      return <span>{!onboarding.isHydrated ? 'loading' :
        `${onboarding.shouldShowWelcome}/${onboarding.shouldShowPageTour('indices')}/${onboarding.shouldShowPageTour('rankings')}`}</span>
    }
    const container = document.createElement('div')
    container.innerHTML = renderToString(<OnboardingStatus />)
    expect(container.textContent).toBe('loading')
    localStorage.setItem('sector-king-onboarding', JSON.stringify({
      version: 1, welcomeCompleted: true, pageToursCompleted: { indices: true },
    }))
    document.body.append(container)
    const recoverable = vi.fn()
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <OnboardingStatus />, { onRecoverableError: recoverable })
    })
    expect(container.textContent).toBe('false/false/true')
    expect(recoverable).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    container.remove()
  })

  it('hydrates a visible hint safely and remembers dismissal after remount', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<OnboardingHintStrip />)
    expect(container.innerHTML).toBe('')
    document.body.append(container)
    const recoverable = vi.fn()
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <OnboardingHintStrip />, { onRecoverableError: recoverable })
    })
    expect(screen.getByRole('status')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '이 안내 닫기' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(recoverable).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    container.remove()
    render(<OnboardingHintStrip />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps onboarding resets scoped to the selected page and persists them', () => {
    localStorage.setItem('sector-king-onboarding', JSON.stringify({
      version: 1, welcomeCompleted: true, pageToursCompleted: { rankings: true, indices: true },
    }))
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.shouldShowWelcome).toBe(false)
    expect(result.current.shouldShowPageTour('rankings')).toBe(false)
    act(() => result.current.resetPageTour('rankings'))
    expect(result.current.shouldShowPageTour('rankings')).toBe(true)
    expect(result.current.shouldShowPageTour('indices')).toBe(false)
    expect(JSON.parse(localStorage.getItem('sector-king-onboarding')!).pageToursCompleted).toEqual({ indices: true })
  })

  it('handles denied browser storage quietly', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    render(<OnboardingHintStrip />)
    expect(screen.queryByRole('status')).toBeNull()
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.shouldShowWelcome).toBe(true)
    act(() => result.current.completeWelcome())
    expect(result.current.shouldShowWelcome).toBe(false)
  })
})

describe('news subscription lifecycle', () => {
  it('preserves the login return destination and persistent dismissal', () => {
    const view = render(<NewsSubscribeCta variant="banner" dismissible />)
    fireEvent.click(screen.getByRole('button', { name: '로그인하고 구독' }))
    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fme%2Fsettings%3Fintent%3Dsubscribe')
    fireEvent.click(screen.getByRole('button', { name: '배너 닫기' }))
    view.unmount()
    render(<NewsSubscribeCta variant="banner" dismissible />)
    expect(screen.queryByRole('button', { name: '로그인하고 구독' })).toBeNull()
  })

  it('shows subscribed feedback only after the update succeeds', async () => {
    mocks.user = { id: 'user' }
    render(<NewsSubscribeCta />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '매일 아침 메일로 받기' })))
    expect(mocks.update).toHaveBeenCalledWith({ dailyReport: true })
    expect(screen.getByText('메일 구독 중')).toBeVisible()
  })
})

describe('header browser state', () => {
  it('switches responsive action trees and refreshes timestamp status on reveal', () => {
    let desktop = false
    let notify = () => {}
    const remove = vi.fn()
    vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
      media, get matches() { return desktop }, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      addEventListener: (_event: string, callback: EventListenerOrEventListenerObject) => {
        notify = () => typeof callback === 'function' && callback(new Event('change'))
      },
      removeEventListener: remove,
    }))
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-10T12:00:00Z').getTime())
    const view = render(<GlobalTopBar lastUpdated="2026-11-08T12:00:00Z" />)
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '계정 테스트' })).toBeNull()
    act(() => { desktop = true; notify() })
    expect(screen.queryByRole('button', { name: '메뉴 열기' })).toBeNull()
    expect(screen.getAllByRole('button', { name: '계정 테스트' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '데이터 기준일 보기' }))
    expect(screen.getByText(/2026-11-08T12:00:00Z/)).toHaveClass('text-warning')
    view.unmount()
    expect(remove).toHaveBeenCalled()
  })
})
