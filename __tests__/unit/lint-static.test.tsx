import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RecentlyViewedRow } from '@/components/me/recently-viewed-row'
import { CompanyRankingTable } from '@/components/statistics/company-ranking-table'
import { CategoryIcon } from '@/components/ui/category-icon'
import { IndustryIcon } from '@/components/ui/industry-icon'
import type { RecentlyViewedItemDTO } from '@/drizzle/supabase-schema'
import type { CompanyStatItem } from '@/types'

const recent = vi.hoisted(() => ({ items: [] as RecentlyViewedItemDTO[] }))
vi.mock('@/hooks/me/use-recently-viewed', () => ({
  useRecentlyViewed: () => ({ items: recent.items, isLoading: false }),
}))
vi.mock('@/hooks/use-currency-format', () => ({
  useCurrencyFormat: () => ({ marketCap: (value: number) => `$${value}` }),
}))

beforeEach(() => {
  recent.items = [{
    id: 'recent-tech', itemType: 'industry', itemKey: 'tech',
    displayName: '기술', viewedAt: '2026-11-09T00:00:00Z',
  }]
})

const company: CompanyStatItem = {
  ticker: 'AAPL', name: 'Apple', nameKo: null, count: 2,
  sectors: [{ id: 'phones', name: '스마트폰', rank: 1 }],
  latestSnapshot: { marketCap: 1000, price: 10, priceChange: 1.5 },
}

describe('stable components after lint cleanup', () => {
  it('keeps focus on a recent link when its label refreshes', () => {
    const { rerender } = render(<RecentlyViewedRow />)
    const link = screen.getByRole('link', { name: /기술/ })
    link.focus()
    recent.items = [{ ...recent.items[0], displayName: '기술 산업' }]
    rerender(<RecentlyViewedRow />)

    expect(screen.getByRole('link', { name: /기술 산업/ })).toBe(link)
    expect(link).toHaveFocus()
    expect(link).toHaveAttribute('href', '/tech')
  })

  it('keeps the sort header mounted and uses current sorting and row callbacks', () => {
    const oldSort = vi.fn()
    const newSort = vi.fn()
    const onPageChange = vi.fn()
    const onCompanyClick = vi.fn()
    const props = {
      companies: [company], total: 40, page: 1, totalPages: 2,
      sort: 'name' as const, order: 'asc' as const,
      onSortChange: oldSort, onPageChange, onCompanyClick,
    }
    const { rerender } = render(<CompanyRankingTable {...props} />)
    const header = screen.getByRole('columnheader', { name: '회사' })
    rerender(<CompanyRankingTable {...props} sort="count" order="desc" onSortChange={newSort} />)

    expect(screen.getByRole('columnheader', { name: '회사' })).toBe(header)
    fireEvent.click(header)
    expect(newSort).toHaveBeenCalledWith('name')
    expect(oldSort).not.toHaveBeenCalled()
    expect(screen.getByRole('columnheader', { name: '횟수' }).querySelector('svg')).toHaveClass('rotate-180')
    fireEvent.click(screen.getByText('Apple'))
    expect(onCompanyClick).toHaveBeenCalledWith('AAPL')
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('preserves mapped icons, fallback, and caller accessibility props', () => {
    const { container, rerender } = render(<IndustryIcon iconKey="tech" className="custom" aria-label="기술" />)
    expect(container.querySelector('svg')).toHaveClass('lucide-cpu', 'custom', 'h-5', 'w-5')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', '기술')
    rerender(<CategoryIcon iconKey="semiconductor" />)
    expect(container.querySelector('svg')).toHaveClass('lucide-memory-stick')
    rerender(<CategoryIcon iconKey={null} />)
    expect(container.querySelector('svg')).toHaveClass('lucide-layers')
  })
})
