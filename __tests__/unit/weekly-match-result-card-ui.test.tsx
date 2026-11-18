import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WeeklyMatchResultCard } from '@/components/weekly-match/weekly-match-result-card'
import type { WeeklyMatchResultCard as Card } from '@/lib/weekly-match/types'
const mocks=vi.hoisted(()=>({download:vi.fn(),copy:vi.fn()}))
vi.mock('@/lib/weekly-match/result-card',async()=>({...await vi.importActual('@/lib/weekly-match/result-card'),downloadResultCard:mocks.download}))
vi.mock('@/lib/share',()=>({copyToClipboard:mocks.copy}))
const card:Card={roundId:'a',title:'은행 대 조선',baseDate:'2026-11-13',endDate:'2026-11-20',sideName:'은행',outcome:'hit',leftName:'은행',rightName:'조선',leftReturn:1,rightReturn:0,version:2,settledAt:'2026-11-20T09:00:00Z'}
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup)
describe('내려받기와 공유 실패',()=>{
 it('shows export failure without reporting success',async()=>{mocks.download.mockRejectedValue(new Error('canvas'));render(<WeeklyMatchResultCard card={card}/>);fireEvent.click(screen.getByText(/내 결과 카드 만들기/));fireEvent.click(screen.getByRole('button',{name:'결과 카드 PNG 내려받기'}));expect(await screen.findByRole('alert')).toHaveTextContent('카드를 만들지 못했습니다');expect(screen.queryByText('카드 내려받기를 시작했습니다.')).not.toBeInTheDocument()})
 it('does not claim clipboard success after denial',async()=>{mocks.copy.mockResolvedValue(false);render(<WeeklyMatchResultCard card={card}/>);fireEvent.click(screen.getByText(/내 결과 카드 만들기/));fireEvent.click(screen.getByRole('button',{name:'결과 글 복사'}));expect(await screen.findByRole('alert')).toHaveTextContent('글을 복사하지 못했습니다')})
})
