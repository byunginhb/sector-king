'use client'

import Link from 'next/link'
import { Award, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { ApiResponse } from '@/types'
import type { WeeklyMatchRewards } from '@/lib/weekly-match/types'
import { WeeklyMatchResultCard } from './weekly-match-result-card'

async function readRewards() {
  const response = await fetch('/api/me/weekly-match/rewards', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  const body = await response.json() as ApiResponse<{ rewards: WeeklyMatchRewards }>
  if (!response.ok || !body.success || !body.data) throw new Error('REWARDS_READ_FAILED', { cause: response.status })
  return body.data.rewards
}

export function WeeklyMatchRewardsPanel() {
  const { user, isLoading } = useCurrentUser()
  const rewards = useQuery({ queryKey: ['me', 'weekly-match-rewards', user?.id], queryFn: readRewards, enabled: !!user, retry: false, gcTime: 0, refetchInterval: 60_000, refetchOnWindowFocus: true })
  const content = () => {
    if (isLoading) return <p role="status" className="text-sm text-muted-foreground">로그인 확인 중</p>
    if (!user) return <div className="text-sm leading-relaxed text-muted-foreground">
      <p>로그인 후 실제 참여 기록으로 첫 참여 배지와 이번 달 점수를 확인하세요.</p>
      <Button asChild variant="outline" className="mt-3 min-h-11"><Link href="/login?redirect=%2Fweekly-match">로그인하고 내 기록 확인</Link></Button>
    </div>
    if (rewards.isPending) return <p role="status" className="text-sm text-muted-foreground">내 보상을 불러오는 중입니다.</p>
    if (rewards.isError) return <div role="alert" className="text-sm">
      <p>보상을 불러오지 못했습니다. 실제 기록 확인 후 다시 표시합니다.</p>
      {rewards.error.cause === 401 ? <Button asChild variant="outline" className="mt-3 min-h-11"><Link href="/login?redirect=%2Fweekly-match">다시 로그인하기</Link></Button> : <Button variant="outline" className="mt-3 min-h-11" onClick={() => rewards.refetch()}>보상 다시 불러오기</Button>}
    </div>
    const data = rewards.data
    return <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4"><Award className="h-6 w-6 text-primary" aria-hidden /><p className="mt-3 font-semibold">{data.firstPick ? '첫 참여 배지 획득' : '첫 참여 배지 대기'}</p><p className="mt-2 text-sm text-muted-foreground">{data.firstPick ? '정상 선택 저장 기록으로 획득했습니다.' : '실제 접수 중인 대진에 첫 선택을 저장하면 획득합니다.'}</p></div>
        <div className="rounded-lg border border-border bg-background p-4"><p className="text-sm text-muted-foreground">{data.season} 월별 시즌</p><p className="mt-2 font-display text-3xl font-semibold">{data.points}점</p><p className="mt-2 text-sm">적중 {data.wins}회 · 실패 {data.losses}회</p><p className="mt-1 text-xs text-muted-foreground">참여 {data.participations}회 · 미확정 {data.pending}회 · 동률·무효 {data.excluded}회</p></div>
      </div>
      {data.cards.length > 0 && <div className="mt-5 space-y-4">{data.cards.map(card => <WeeklyMatchResultCard key={`${user.id}:${card.roundId}:${card.version}`} card={card} />)}</div>}
    </>
  }
  return <section aria-labelledby="my-match-rewards" className="mt-10 rounded-xl border border-border bg-surface-2 p-5 sm:p-7">
    <h2 id="my-match-rewards" className="mb-5 flex items-center gap-2 font-display text-2xl font-semibold"><Trophy className="h-5 w-5 text-primary" aria-hidden />나의 참여와 보상</h2>
    {content()}
    <Link href="/weekly-match#rankings" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">시즌 순위에서 내 기록 자랑하기</Link>
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">한국시간 현재 월에 종료되는 대진의 최신 확정 결과로 적중당 1점을 계산합니다. 실패는 0점이며 동률·무효는 적중·실패에서 제외합니다. 정정 시 점수도 바뀔 수 있습니다. 연습은 제외하며 점수는 현금이나 이용권으로 교환되지 않습니다.</p>
  </section>
}
