'use client'

import { useState } from 'react'
import { Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/share'
import { trackEvent } from '@/lib/analytics'
import { CARD_OUTCOME, cardReturn, downloadResultCard, resultCardText } from '@/lib/weekly-match/result-card'
import type { WeeklyMatchResultCard as ResultCard } from '@/lib/weekly-match/types'

export function WeeklyMatchResultCard({ card }: { card: ResultCard }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function exportCard() {
    setBusy(true); setMessage(''); setError('')
    try {
      await downloadResultCard(card)
      setMessage('카드 내려받기를 시작했습니다.')
      trackEvent('weekly_match_card_download', { round_id: card.roundId, version: card.version })
    } catch { setError('카드를 만들지 못했습니다. 다시 시도하거나 결과 글을 복사해 주세요.') }
    finally { setBusy(false) }
  }
  async function copyResult() {
    setMessage(''); setError('')
    if (await copyToClipboard(resultCardText(card))) {
      setMessage('공유할 결과 글을 복사했습니다.')
      trackEvent('share', { content_type: 'weekly_match_result', item_id: card.roundId, method: 'copy' })
    } else { setError('글을 복사하지 못했습니다. 브라우저의 복사 권한을 확인해 주세요.') }
  }
  return <details className="border-t border-border pt-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{card.title} · 내 결과 카드 만들기</summary>
    <div className="mt-2 rounded-xl border border-border bg-background p-5" aria-label="공유할 결과 미리보기">
      <p className="text-sm text-primary">Sector King · 나의 섹터 매치</p>
      <h3 className="mt-3 font-display text-xl font-semibold">{card.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{card.baseDate} ~ {card.endDate}</p>
      <p className="mt-4 text-2xl font-semibold">{CARD_OUTCOME[card.outcome]} <span className="text-sm font-normal text-muted-foreground">내 선택: {card.sideName}</span></p>
      <p className="mt-3 text-sm">{card.leftName} {cardReturn(card.leftReturn)} / {card.rightName} {cardReturn(card.rightReturn)}</p>
      <p className="mt-3 break-words text-xs text-muted-foreground">결과 버전 {card.version} · 확정 {card.settledAt}</p>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">위 내용만 이미지나 글에 담습니다. 실명·이메일은 포함하지 않습니다. 내려받은 이미지는 정정 이후 자동 갱신되지 않으므로 최신 버전을 확인해 주세요.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-11" disabled={busy} aria-busy={busy} onClick={exportCard}><Download className="mr-2 h-4 w-4" aria-hidden />{busy ? '카드 만드는 중' : '결과 카드 PNG 내려받기'}</Button>
      <Button variant="outline" className="min-h-11" onClick={copyResult}><Copy className="mr-2 h-4 w-4" aria-hidden />결과 글 복사</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <p role="status" className="mt-2 text-sm text-success">{message}</p>
  </details>
}
