import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FlowCard } from '@/components/money-flow/flow-card'
import { FlowRiver } from '@/components/money-flow/flow-river'
import { IndustryMoneyFlowCard } from '@/components/dashboard/industry-money-flow-card'
import type { SectorMoneyFlow } from '@/types'

vi.mock('framer-motion', () => ({
  motion: Object.fromEntries(['div', 'text', 'circle', 'g', 'path', 'stop'].map((tag) => [tag,
    function Motion({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
      const animate = props.animate
      const transition = props.transition
      for (const key of ['animate', 'transition', 'initial', 'whileHover']) delete props[key]
      return createElement(tag, { ...props, 'data-animate': JSON.stringify(animate), 'data-transition': JSON.stringify(transition) }, children)
    },
  ])),
}))
vi.mock('@/hooks/use-currency-format', () => ({ useCurrencyFormat: () => ({ flowAmount: (value: number) => `${value} USD` }) }))
vi.mock('@/components/dashboard/ticker-tape', () => ({ TickerTape: () => null }))
vi.mock('@/hooks/use-industry-money-flow', () => ({
  useIndustryMoneyFlow: () => ({
    isLoading: false, error: null,
    data: {
      period: 14, dateRange: { start: '2026-11-02', end: '2026-11-04' }, dates: ['2026-11-02', '2026-11-03', '2026-11-04'],
      industries: [
        { industryId: 'semiconductor', industryName: '반도체', netFlow: 120, netFlowPercent: 3.2, flowDirection: 'in', totalInflow: 180, totalOutflow: 60, trend: [0, 60, 120] },
        { industryId: 'finance', industryName: '금융', netFlow: -80, netFlowPercent: -2.1, flowDirection: 'out', totalInflow: 20, totalOutflow: 100, trend: [0, -30, -80] },
      ],
    },
  }),
}))

const flow: SectorMoneyFlow = {
  id: 'banks', name: '은행', nameEn: null, flowDirection: 'in', flowAmount: 120, flowPercent: 3.2,
  companyCount: 7, mfi: 55, startMarketCap: 1000, endMarketCap: 1120, trend: [],
}
const arrowNodes = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLDivElement>('div[aria-hidden="true"].pointer-events-none.z-10'))

describe('stable flow motion', () => {
  it('renders identical geometry and timing for repeated server renders in both directions', () => {
    for (const direction of ['in', 'out'] as const) {
      for (const Component of [FlowCard, FlowRiver]) {
        const node = <Component flow={{ ...flow, flowDirection: direction }} index={2} maxFlow={240} />
        expect(renderToStaticMarkup(node)).toBe(renderToStaticMarkup(node))
      }
    }
    expect(renderToStaticMarkup(<IndustryMoneyFlowCard />)).toBe(renderToStaticMarkup(<IndustryMoneyFlowCard />))
  })

  it('keeps arrow direction, signed values and decorative accessibility', () => {
    const view = render(<FlowCard flow={flow} index={0} maxFlow={240} />)
    expect(screen.getByText('+120 USD')).toBeInTheDocument()
    expect(screen.getByText('유입 ↑')).toBeInTheDocument()
    expect(arrowNodes(view.container).length).toBeGreaterThan(0)
    expect(arrowNodes(view.container).every((arrow) => JSON.parse(arrow.dataset.animate!).y === -120)).toBe(true)
    view.rerender(<FlowCard flow={{ ...flow, flowDirection: 'out', flowPercent: -3.2 }} index={0} maxFlow={240} />)
    expect(screen.getByText('-120 USD')).toBeInTheDocument()
    expect(screen.getByText('유출 ↓')).toBeInTheDocument()
    expect(arrowNodes(view.container).every((arrow) => JSON.parse(arrow.dataset.animate!).y === 120)).toBe(true)
  })

  it('keeps river particle direction and amount-based density', () => {
    const view = render(<FlowRiver flow={flow} index={0} maxFlow={240} />)
    const incoming = view.container.querySelector('text[data-animate]')!
    expect(JSON.parse(incoming.getAttribute('data-animate')!).x).toEqual([-30, 430])
    expect(view.container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const smallCount = view.container.querySelectorAll('text').length
    view.rerender(<FlowRiver flow={{ ...flow, flowDirection: 'out', flowAmount: 240, flowPercent: -3.2 }} index={0} maxFlow={240} />)
    const outgoing = view.container.querySelector('text[data-animate]')!
    expect(JSON.parse(outgoing.getAttribute('data-animate')!).x).toEqual([430, -30])
    expect(view.container.querySelectorAll('text').length).toBeGreaterThan(smallCount)
    expect(screen.getByText('-240 USD')).toBeInTheDocument()
  })

  it('pauses dashboard arrows in place and keeps both financial direction labels', () => {
    const view = render(<IndustryMoneyFlowCard />)
    const geometry = () => arrowNodes(view.container).map((arrow) => ({ left: arrow.style.left, width: arrow.querySelector('svg')!.getAttribute('width') }))
    const before = geometry()
    expect(before.length).toBeGreaterThan(0)
    expect(screen.getByText('+120 USD')).toBeInTheDocument()
    expect(screen.getByText('-80 USD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '애니메이션 끄기' }))
    expect(screen.getByRole('button', { name: '애니메이션 켜기' })).toHaveAttribute('aria-pressed', 'true')
    expect(geometry()).toEqual(before)
    expect(arrowNodes(view.container).every((arrow) => arrow.style.opacity === '0.5')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '애니메이션 켜기' }))
    expect(geometry()).toEqual(before)
    expect(arrowNodes(view.container).every((arrow) => arrow.dataset.animate)).toBe(true)
  })
})
