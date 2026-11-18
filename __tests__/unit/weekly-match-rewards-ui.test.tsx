import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeeklyMatchRewardsPanel } from '@/components/weekly-match/weekly-match-rewards'
const auth=vi.hoisted(()=>({user:null as {id:string}|null,isLoading:false}))
vi.mock('@/hooks/use-current-user',()=>({useCurrentUser:()=>auth}))
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><WeeklyMatchRewardsPanel /></QueryClientProvider>)}
beforeEach(()=>{auth.user=null;vi.stubGlobal('fetch',vi.fn())})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('본인 보상',()=>{
 it('does not fetch private rewards before login',()=>{mount();expect(screen.getByText(/로그인 후 실제 참여 기록/)).toBeVisible();expect(fetch).not.toHaveBeenCalled()})
 it('renders server-derived points and first participation without granting extra points',async()=>{
  auth.user={id:'own'};vi.mocked(fetch).mockResolvedValue(Response.json({success:true,data:{rewards:{season:'2026-11',firstPick:true,participations:3,points:1,wins:1,losses:1,excluded:1,pending:0,cards:[]}}}));mount();expect(await screen.findByText('첫 참여 배지 획득')).toBeVisible();expect(screen.getByText('1점')).toBeVisible();expect(screen.getByText(/적중 1회 · 실패 1회/)).toBeVisible();expect(fetch).toHaveBeenCalledWith('/api/me/weekly-match/rewards',expect.objectContaining({cache:'no-store'}))
 })
 it('does not hide outages as a zero score and provides retry',async()=>{auth.user={id:'own'};vi.mocked(fetch).mockResolvedValue(Response.json({success:false},{status:503}));mount();expect(await screen.findByRole('alert')).toHaveTextContent('보상을 불러오지 못했습니다');expect(screen.queryByText('0점')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'보상 다시 불러오기'}))})
})
