/**
 * 일별 이메일 구독 토글 (M4).
 *
 * RESEND_API_KEY 미설정 → emailEnabled === false → 토글 disabled + 안내문구.
 */
'use client'

import { Mail, Clock } from 'lucide-react'
import { useEmailSubscription } from '@/hooks/me/use-email-subscription'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function EmailSubscriptionToggle() {
  const { subscription, isLoading, update, isPending } = useEmailSubscription()

  if (isLoading || !subscription) {
    return <Skeleton className="h-24" />
  }

  const disabled = !subscription.emailEnabled || isPending

  async function handleToggle() {
    if (!subscription) return
    if (disabled) return
    try {
      await update({ dailyReport: !subscription.dailyReport })
    } catch (err) {
      console.error('이메일 구독 토글 실패', err)
    }
  }

  async function handleHourChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!subscription) return
    const hour = Number(e.target.value)
    if (!Number.isFinite(hour)) return
    try {
      await update({ hourKst: hour })
    } catch (err) {
      console.error('이메일 시간 변경 실패', err)
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Mail className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                일별 마켓 리포트 이메일
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                매일 아침 KST 기준으로 워치리스트 PnL 한 줄 요약을 받습니다.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={subscription.dailyReport}
              disabled={disabled}
              onClick={handleToggle}
              className={cn(
                'shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                disabled && 'opacity-50 cursor-not-allowed',
                subscription.dailyReport ? 'bg-primary' : 'bg-surface-3'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  subscription.dailyReport ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {!subscription.emailEnabled && (
        <p className="text-xs text-muted-foreground bg-surface-2/50 rounded px-2 py-1.5">
          이메일 발송 인프라(RESEND_API_KEY)가 등록되지 않아 일시적으로 비활성화
          상태입니다. 곧 지원 예정입니다.
        </p>
      )}

      {subscription.dailyReport && subscription.emailEnabled && (
        <div className="flex items-center gap-2 pl-8">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <label className="text-xs text-muted-foreground" htmlFor="email-hour">
            발송 시각
          </label>
          <select
            id="email-hour"
            value={subscription.hourKst}
            onChange={handleHourChange}
            disabled={isPending}
            className="text-xs bg-surface-2 border border-border-subtle rounded px-2 py-1 tabular-nums"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00 KST
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
