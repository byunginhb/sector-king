import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Link from 'next/link'
import { FeatureGate } from '@/components/gate/feature-gate'
import { PartialGate, GatedValue } from '@/components/gate/partial-gate'
import { GATED_ROOT_CLASS } from '@/lib/permissions/constants'
import type { GateDecision } from '@/lib/permissions/types'

/*
 * vitest.setup.ts 의 공용 ResizeObserver 스텁은 `vi.fn().mockImplementation(화살표)`
 * 라서 `new` 로 호출할 수 없다. FeatureGate 는 오버레이 변형을 컨테이너 높이로
 * 고르느라 실제로 `new ResizeObserver` 를 부르므로, 이 파일에서만 생성 가능한
 * 클래스로 덮는다(공용 setup 은 다른 테스트가 의존하므로 건드리지 않는다).
 */
beforeAll(() => {
  class TestResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

function decision(overrides: Partial<GateDecision> = {}): GateDecision {
  return {
    featureId: 'rankings.table',
    allowed: false,
    gateMode: 'blur',
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

  it('차단되면 베일에 aria-hidden 과 inert 를 함께 건다', () => {
    const { container } = render(
      <FeatureGate featureId="rankings.table" decision={decision()} lockedCount={3}>
        <p>실제 값</p>
      </FeatureGate>
    )

    const veil = container.querySelector('.sk-gate-veil')
    expect(veil).not.toBeNull()
    // 셋 다 필요하다 — 하나씩은 각각 구멍이 있다.
    expect(veil).toHaveAttribute('aria-hidden', 'true')
    expect(veil).toHaveAttribute('inert')
    expect(veil).toHaveClass('pointer-events-none')
  })

  it('차단되면 게이트 루트에 계약 클래스와 QA 셀렉터가 붙는다', () => {
    const { container } = render(
      <FeatureGate featureId="rankings.table" decision={decision()} lockedCount={2}>
        <p>실제 값</p>
      </FeatureGate>
    )

    const root = container.querySelector(`.${GATED_ROOT_CLASS}`)
    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('data-gate', 'blur')
    expect(root).toHaveAttribute('data-feature', 'rankings.table')
  })

  it('오버레이에 잠긴 이유와 CTA 링크가 텍스트로 존재한다', () => {
    render(
      <FeatureGate
        featureId="rankings.table"
        decision={decision()}
        lockedCount={3}
        variant="panel"
      >
        <p>실제 값</p>
      </FeatureGate>
    )

    // 흐림(시각 신호)만으로 상태를 전달하지 않는다 — 항상 텍스트가 동반한다.
    expect(screen.getByText('Pro 전용')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pro 알아보기' })).toBeInTheDocument()
  })

  it('lockedCount 만큼 더미 행을 그리고 실제 값은 DOM 에 넣지 않는다', () => {
    const { container } = render(
      <FeatureGate featureId="rankings.table" decision={decision()} lockedCount={3}>
        <p>영업비밀 71.4%</p>
      </FeatureGate>
    )

    expect(container.querySelector('.sk-gate-veil')?.textContent).not.toContain('71.4%')
    // 더미 행의 순위 번호 1·2·3
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
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

  it('베일 안에는 포커스 가능한 요소가 없다', () => {
    const { container } = render(
      <FeatureGate featureId="rankings.table" decision={decision()} lockedCount={4}>
        <Link href="/stock/NVDA">엔비디아</Link>
      </FeatureGate>
    )

    const veil = container.querySelector('.sk-gate-veil')
    expect(veil?.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
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
