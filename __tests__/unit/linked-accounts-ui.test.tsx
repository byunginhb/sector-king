import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LinkedAccountsSection } from '@/components/me/linked-accounts-section'
import { buildLinkedAccountsView } from '@/lib/auth/linked-accounts'
import type { EnabledAuthProviders } from '@/lib/auth/enabled-providers'

// 로그인해야만 보이는 화면이라 브라우저로 확인할 수 없다. 렌더만이라도
// 고정해 둔다 — 해제 버튼이 잘못 뜨는 건 계정 잠김으로 이어진다.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

const ALL_ON: EnabledAuthProviders = {
  google: true,
  kakao: true,
  naver: true,
  email: true,
}

function identity(provider: string, email: string | null = null) {
  return { identity_id: `id-${provider}`, provider, identity_data: { email } }
}

function renderWith(identities: ReturnType<typeof identity>[]) {
  return render(
    <LinkedAccountsSection view={buildLinkedAccountsView(identities, ALL_ON)} />
  )
}

describe('LinkedAccountsSection', () => {
  it('연결된 수단과 남은 연결 버튼을 함께 보여준다', () => {
    renderWith([identity('google', 'a@gmail.com')])

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('a@gmail.com')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '카카오 연결' })
    ).toBeInTheDocument()
  })

  it('수단이 하나뿐이면 해제 버튼이 아예 없다', () => {
    renderWith([identity('google', 'a@gmail.com')])
    expect(screen.queryByRole('button', { name: /연결 해제/ })).toBeNull()
  })

  it('둘 이상이면 해제 버튼이 생긴다', () => {
    renderWith([identity('google', 'a@gmail.com'), identity('kakao')])

    expect(
      screen.getByRole('button', { name: 'Google 연결 해제' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '카카오 연결 해제' })
    ).toBeInTheDocument()
  })

  it('셋 다 연결되면 연결 버튼이 사라진다', () => {
    renderWith([
      identity('google', 'a@gmail.com'),
      identity('kakao'),
      identity('custom:naver', 'a@naver.com'),
    ])

    expect(screen.getByText('네이버')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\S+ 연결$/ })).toBeNull()
  })

  it('이메일을 안 준 제공자는 "이메일 미제공" 으로 자리를 채운다', () => {
    renderWith([identity('kakao', null)])
    expect(screen.getByText('이메일 미제공')).toBeInTheDocument()
  })
})
