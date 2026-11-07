import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WatchlistPrompt } from '@/components/me/watchlist-prompt'
import { PageFaq } from '@/components/seo/page-faq'
import { RANKINGS_FAQ } from '@/lib/seo-faq'
import {
  PICK_PROFILES,
  PICK_PROFILE_META,
  PICK_WEIGHTS,
} from '@/lib/pick-profile'
import { trackEvent } from '@/lib/analytics'

vi.mock('next/navigation', () => ({
  usePathname: () => '/guide/sector-rotation',
}))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))

describe('검색 진입 후 관심 목록 안내', () => {
  beforeEach(() => vi.clearAllMocks())

  it('기존 섹터 탐색과 인증 가드가 있는 관심 목록으로 연결한다', () => {
    render(<WatchlistPrompt />)

    expect(screen.getByRole('link', { name: '섹터 살펴보기' })).toHaveAttribute(
      'href',
      '/sectors'
    )
    expect(
      screen.getByRole('link', { name: '내 관심 목록 열기' })
    ).toHaveAttribute('href', '/me/watchlist')
    expect(screen.getByText(/로그인/)).toBeVisible()
  })

  it('각 링크 클릭은 저장 완료가 아닌 콘텐츠 선택으로 기록한다', () => {
    render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <WatchlistPrompt />
      </div>
    )

    fireEvent.click(screen.getByRole('link', { name: '섹터 살펴보기' }))
    fireEvent.click(screen.getByRole('link', { name: '내 관심 목록 열기' }))

    expect(trackEvent).toHaveBeenCalledTimes(2)
    expect(trackEvent).toHaveBeenNthCalledWith(1, 'select_content', {
      content_type: 'guide_sector_explore',
      page_path: '/guide/sector-rotation',
    })
    expect(trackEvent).toHaveBeenNthCalledWith(2, 'select_content', {
      content_type: 'guide_watchlist_prompt',
      page_path: '/guide/sector-rotation',
    })
  })
})

describe('가시 FAQ와 구조화 데이터', () => {
  it('같은 질문·답변 원천을 본문과 JSON-LD에 렌더하고 main을 추가하지 않는다', () => {
    const { container } = render(<PageFaq items={RANKINGS_FAQ} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.textContent!)

    expect(
      screen.getByRole('heading', { level: 2, name: '자주 묻는 질문' })
    ).toBeVisible()
    expect(container.querySelector('main')).toBeNull()
    expect(jsonLd.mainEntity).toHaveLength(RANKINGS_FAQ.length)
    RANKINGS_FAQ.forEach(({ question, answer }, index) => {
      expect(
        screen.getByRole('heading', { level: 3, name: question })
      ).toBeVisible()
      expect(screen.getByText(answer)).toBeVisible()
      expect(jsonLd.mainEntity[index]).toMatchObject({
        name: question,
        acceptedAnswer: { text: answer },
      })
    })
  })

  it('픽의 세 점수와 실제 투자 성향 가중치·결측 처리 방식을 설명한다', () => {
    const answer = RANKINGS_FAQ[0].answer
    expect(answer).toContain('DCF')
    expect(answer).toContain('단기·장기·DCF')
    for (const profile of PICK_PROFILES) {
      const weight = PICK_WEIGHTS[profile]
      expect(answer).toContain(
        `${PICK_PROFILE_META[profile].label} 성향은 ${weight.short * 100}%·${weight.long * 100}%·${weight.dcf * 100}%`
      )
    }
    expect(answer).toContain('재분배')
    expect(answer).not.toContain('무료')
  })
})
