'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'
import type { WeeklyMatchSide } from '@/lib/weekly-match/types'

// 고정 가상 선택이며 실제 사용자나 시장 예측 성과를 나타내지 않는다.
export const PRACTICE_PLAYERS = Object.freeze(Array.from({ length: 49 }, (_, index) => ({
  id: `practice-${index + 1}`,
  side: ((index * 17 + 3) % 49 < 26 ? 'left' : 'right') as WeeklyMatchSide,
})))
const names = { left: '한국 은행', right: '조선' }

export function WeeklyMatchPractice() {
  const [choice, setChoice] = useState<WeeklyMatchSide | null>(null)
  const leftCount = PRACTICE_PLAYERS.filter(player => player.side === 'left').length
  return (
    <section id="practice" aria-labelledby="practice-heading" className="mt-10 scroll-mt-24 rounded-xl border border-border bg-surface-2 p-5 sm:p-7">
      <div className="flex items-center gap-2 text-sm text-primary"><Users className="h-4 w-4" aria-hidden />가상 참가자 49명 · 연습 전용</div>
      <h2 id="practice-heading" className="mt-3 font-display text-2xl font-semibold">먼저 한 번 골라보세요</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">로그인 없이 가상 참가자의 선택과 비교해 보세요. 실제 참여 수·점수·보상에 포함되지 않으며, 시세나 승패를 만들어내지 않습니다.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(['left', 'right'] as const).map(side => (
          <Button key={side} variant={choice === side ? 'default' : 'outline'} className="min-h-16 text-base" aria-label={`연습으로 ${names[side]} 선택`} aria-pressed={choice === side} onClick={() => { setChoice(side); trackEvent('weekly_match_practice_pick', { side }) }}>
            {names[side]}
          </Button>
        ))}
      </div>
      <p role="status" className="mt-4 min-h-6 text-sm font-medium">{choice ? `연습 선택: ${names[choice]} · 가상 참가자 ${choice === 'left' ? leftCount : 49 - leftCount}명과 같은 선택입니다.` : '두 섹터 중 하나를 선택하면 가상 참가자의 선택 분포가 표시됩니다.'}</p>
      {choice && <div className="mt-3">
        <div className="flex justify-between gap-3 text-sm"><span>가상 은행 선택 {leftCount}명</span><span>가상 조선 선택 {49 - leftCount}명</span></div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-border" aria-hidden><div className="bg-primary" style={{ width: `${leftCount / 49 * 100}%` }} /><div className="flex-1 bg-muted-foreground" /></div>
        <p className="mt-3 text-xs text-muted-foreground">고정된 가상 선택 분포입니다. 실제 이용자의 선택이나 적중률이 아닙니다.</p>
      </div>}
    </section>
  )
}
