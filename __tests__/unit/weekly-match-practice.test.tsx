import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WeeklyMatchPractice, PRACTICE_PLAYERS } from '@/components/weekly-match/weekly-match-practice'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('분리된49가상참가자 체험', () => {
  it('has49stable clearly fictional participants and never writes real choices', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect(PRACTICE_PLAYERS).toHaveLength(49)
    expect(new Set(PRACTICE_PLAYERS.map(x => x.id)).size).toBe(49)
    render(<WeeklyMatchPractice />)
    expect(screen.getByText(/실제 참여 수·점수·보상에 포함되지/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '연습으로 한국 은행 선택' }))
    expect(screen.getByRole('status')).toHaveTextContent('연습 선택: 한국 은행')
    expect(screen.getAllByText(/가상 참가자/).length).toBeGreaterThan(0)
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '연습으로 조선 선택' }))
    expect(screen.getByRole('status')).toHaveTextContent('연습 선택: 조선')
    expect(PRACTICE_PLAYERS.filter(x=>x.side==='left').length+PRACTICE_PLAYERS.filter(x=>x.side==='right').length).toBe(49)
  })
})
