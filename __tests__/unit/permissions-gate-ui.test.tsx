import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGate } from '@/components/gate/feature-gate'
import { PartialGate, GatedValue } from '@/components/gate/partial-gate'
import { GATED_ROOT_CLASS } from '@/lib/permissions/constants'
import type { GateDecision } from '@/lib/permissions/types'

function decision(overrides: Partial<GateDecision> = {}): GateDecision {
  return {
    featureId: 'rankings.table',
    allowed: false,
    gateMode: 'partial',
    params: {},
    requiredTier: 'pro',
    actualTier: 'free',
    ...overrides,
  }
}

describe('FeatureGate', () => {
  it('등급을 충족하면 children 을 그대로 렌더한다 (래퍼도 씌우지 않는다)', () => {
    const { container } = render(
      <FeatureGate
        featureId="rankings.table"
        decision={decision({ allowed: true, gateMode: 'open' })}
      >
        <p>적중률 71.4%</p>
      </FeatureGate>
    )

    expect(screen.getByText('적중률 71.4%')).toBeInTheDocument()
    // `.sk-gated` 가 남으면 페이월 구조화 데이터가 거짓 신고가 된다.
    expect(container.querySelector(`.${GATED_ROOT_CLASS}`)).toBeNull()
  })

  it('일부(partial) 는 축약 콘텐츠를 남기고 안내 스트립을 붙인다', () => {
    const { container } = render(
      <FeatureGate featureId="rankings.table" decision={decision()}>
        <p>상위 3건</p>
      </FeatureGate>
    )

    // 서버가 이미 잘라 보낸 실값이라 그대로 남는다 — 여기서 흐리면 보여야 할
    // 것까지 가려진다(셀 단위 흐림은 PartialGate 담당).
    expect(screen.getByText('상위 3건')).toBeInTheDocument()

    const root = container.querySelector(`.${GATED_ROOT_CLASS}`)
    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('data-gate', 'partial')
    expect(root).toHaveAttribute('data-feature', 'rankings.table')
  })

  it('차단 상태는 시각 신호만이 아니라 텍스트와 CTA 로도 전달된다', () => {
    render(
      <FeatureGate featureId="rankings.table" decision={decision()}>
        <p>상위 3건</p>
      </FeatureGate>
    )

    expect(screen.getByRole('link', { name: 'Pro 알아보기' })).toBeInTheDocument()
  })

  it('hidden 게이트는 자리표시자 없이 완전히 제거한다', () => {
    const { container } = render(
      <FeatureGate
        featureId="rankings.export"
        decision={decision({ gateMode: 'hidden' })}
      >
        <button type="button">CSV 내보내기</button>
      </FeatureGate>
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('hidden 게이트에 fallback 을 주면 그것만 렌더한다', () => {
    render(
      <FeatureGate
        featureId="rankings.export"
        decision={decision({ gateMode: 'hidden' })}
        fallback={<p>구독하면 열립니다</p>}
      >
        <button type="button">CSV 내보내기</button>
      </FeatureGate>
    )

    expect(screen.getByText('구독하면 열립니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'CSV 내보내기' })).toBeNull()
  })
})

describe('PartialGate', () => {
  it('공개 구간은 그대로 두고 안내 스트립을 role="status" 로 붙인다', () => {
    render(
      <PartialGate
        featureId="analysts.leaderboard"
        decision={decision({ featureId: 'analysts.leaderboard', gateMode: 'partial' })}
        lockedCount={3}
      >
        <p>4위 삼성전기 71.4%</p>
      </PartialGate>
    )

    expect(screen.getByText('4위 삼성전기 71.4%')).toBeInTheDocument()

    // 흐린 영역을 대신해 스크린리더가 읽는 유일한 설명이다 — aria-hidden 이면 안 된다.
    const strip = screen.getByRole('status')
    expect(strip).toHaveTextContent('상위 3개 값은 Pro 구독자에게 공개됩니다')
    expect(strip).not.toHaveAttribute('aria-hidden')
  })

  it('오버레이는 묶음당 1개다 (행마다 CTA 를 반복하지 않는다)', () => {
    render(
      <PartialGate
        featureId="analysts.leaderboard"
        decision={decision({ gateMode: 'partial' })}
        lockedCount={3}
        maskedSlot={
          <div>
            <p>row1</p>
            <p>row2</p>
            <p>row3</p>
          </div>
        }
      >
        <p>4위부터</p>
      </PartialGate>
    )

    // 묶음 오버레이 CTA 1개 + 안내 스트립 CTA 1개.
    expect(screen.getAllByRole('link', { name: 'Pro 알아보기' })).toHaveLength(2)
  })

  it('등급을 충족하면 안내 스트립도 계약 클래스도 남기지 않는다', () => {
    const { container } = render(
      <PartialGate
        featureId="analysts.leaderboard"
        decision={decision({ allowed: true, gateMode: 'open' })}
      >
        <p>전체 순위</p>
      </PartialGate>
    )

    expect(screen.queryByRole('status')).toBeNull()
    expect(container.querySelector(`.${GATED_ROOT_CLASS}`)).toBeNull()
  })
})

describe('GatedValue', () => {
  it('셀 내용만 접근성 트리에서 빼고 sr-only 대체 텍스트를 남긴다', () => {
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <GatedValue kind="number" />
            </td>
          </tr>
        </tbody>
      </table>
    )

    // <td> 자체는 살아 있어야 표의 행·열 관계가 깨지지 않는다.
    expect(container.querySelectorAll('td')).toHaveLength(2)
    expect(screen.getByText('Pro 구독자 전용')).toHaveClass('sr-only')

    const dummy = container.querySelector('.sk-gate-veil')
    expect(dummy).toHaveAttribute('aria-hidden', 'true')
    expect(dummy).toHaveAttribute('inert')
  })
})
